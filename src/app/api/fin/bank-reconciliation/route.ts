import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { assertPermission, getRequestIp } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

async function getActor(request: NextRequest): Promise<string> {
  return request.headers.get('x-actor-email') || request.cookies.get('erp_user_email')?.value || ''
}

function generateStatementRef(): string {
  const date = new Date()
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `BRS-${yyyy}${mm}${dd}-${random}`
}

export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request)
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const includeReconciled = searchParams.get('includeReconciled') === 'true'
    const bankAccountId = searchParams.get('bankAccountId')
    const statementId = searchParams.get('statementId')

    const allowed = await assertPermission(pdb, actor, 'BANKRECONCILIATION_VIEW', { request, module: 'BankReconciliation', entityId: 'list' })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    if (statementId) {
      const statement = await pdb.bankReconciliationStatement.findUnique({
        where: { id: Number(statementId) },
        include: {
          bankAccount: { select: { id: true, accountName: true, bankName: true, accountNo: true } },
          transactions: { orderBy: { date: 'desc' } },
          approvals: { orderBy: { createdAt: 'desc' } },
        },
      })
      if (!statement) return NextResponse.json({ success: false, error: 'Statement not found' }, { status: 404 })
      return NextResponse.json({ success: true, data: statement })
    }

    const accounts = await pdb.bankAccount.findMany({
      orderBy: { accountName: 'asc' },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          where: bankAccountId ? { bankAccountId: Number(bankAccountId) } : undefined,
        },
      },
    })

    const statements = await pdb.bankReconciliationStatement.findMany({
      orderBy: { reconDate: 'desc' },
      where: bankAccountId ? { bankAccountId: Number(bankAccountId) } : undefined,
      include: {
        bankAccount: { select: { id: true, accountName: true } },
        approvals: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    const data = accounts.map((a) => {
      const unreconciled = a.transactions.filter((t) => !t.reconciled)
      const reconciled = includeReconciled ? a.transactions.filter((t) => t.reconciled) : []
      const { transactions, ...rest } = a
      const accountStatements = statements.filter((s) => s.bankAccountId === a.id)
      return { ...rest, unreconciled, reconciled, statements: accountStatements }
    })

    return NextResponse.json({ success: true, data, statements })
  } catch (error) {
    console.error('Error fetching bank reconciliation:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request)
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const { bankAccountId, reconDate, transactionIds, action } = body

    if (!bankAccountId || !reconDate) {
      return NextResponse.json({ success: false, error: 'bankAccountId and reconDate are required' }, { status: 400 })
    }

    const allowed = await assertPermission(pdb, actor, 'BANKRECONCILIATION_CREATE', { request, module: 'BankReconciliation', entityId: String(bankAccountId) })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const account = await pdb.bankAccount.findUnique({ where: { id: Number(bankAccountId) } })
    if (!account) return NextResponse.json({ success: false, error: 'Bank account not found' }, { status: 404 })

    const selectedIds = transactionIds && transactionIds.length > 0 ? transactionIds.map(Number) : null
    const transactions = selectedIds
      ? await pdb.bankTransaction.findMany({
          where: { id: { in: selectedIds }, bankAccountId: Number(bankAccountId), reconciled: false },
        })
      : await pdb.bankTransaction.findMany({ where: { bankAccountId: Number(bankAccountId), reconciled: false } })

    if (transactions.length === 0) {
      return NextResponse.json({ success: false, error: 'No unreconciled transactions found' }, { status: 400 })
    }

    // Every selected transaction must fall within the reconciliation period.
    const reconDateMs = new Date(reconDate).getTime()
    const outsidePeriod = transactions.filter((t) => new Date(t.date).getTime() > reconDateMs)
    if (outsidePeriod.length > 0) {
      return NextResponse.json({ success: false, error: 'Selected transactions fall outside the reconciliation period' }, { status: 400 })
    }

    // Net movement = deposits - withdrawals. Outgoing payments are stored with
    // a positive amount and type 'Withdrawal', so they must subtract, not add.
    const netAmount = (t: any) => (t.type === 'Withdrawal' || t.type === 'Payment' ? -Math.abs(Number(t.amount) || 0) : Math.abs(Number(t.amount) || 0))
    const netMovements = transactions.reduce((sum, t) => sum + netAmount(t), 0)
    const openingBalance = 0
    const closingBalance = openingBalance + netMovements

    const statement = await pdb.$transaction(async (tx) => {
      const stmt = await tx.bankReconciliationStatement.create({
        data: {
          bankAccountId: Number(bankAccountId),
          statementRef: generateStatementRef(),
          reconDate: new Date(reconDate),
          openingBalance,
          closingBalance,
          status: action === 'submit' ? 'Pending' : 'Draft',
          makerId: actor,
          checkerId: action === 'submit' ? undefined : null,
        },
      })

      if (transactionIds && transactionIds.length > 0) {
        await tx.bankTransaction.updateMany({
          where: { id: { in: transactionIds.map(Number) } },
          data: { reconciled: true, reconciliationStatementId: stmt.id },
        })
      } else {
        await tx.bankTransaction.updateMany({
          where: { bankAccountId: Number(bankAccountId), reconciled: false },
          data: { reconciled: true, reconciliationStatementId: stmt.id },
        })
      }

      if (action === 'submit') {
        await tx.finApprovalLog.create({
          data: {
            entityType: 'BankReconciliationStatement',
            entityId: String(stmt.id),
            status: 'Pending',
            action: 'SUBMIT',
            makerId: actor,
            comments: 'Submitted for approval',
            bankReconciliationStatementId: stmt.id,
          },
        })
      }

      return stmt
    })

    await pdb.finAccessAuditLog.create({
      data: {
        userEmail: actor,
        module: 'BankReconciliation',
        permissionCode: 'BANKRECONCILIATION_CREATE',
        action: 'CREATE',
        entityId: String(statement.id),
        siteCode: null,
        ip: getRequestIp(request),
        success: true,
      },
    })

    return NextResponse.json({ success: true, data: statement }, { status: 201 })
  } catch (error) {
    console.error('Error creating reconciliation statement:', error)
    return NextResponse.json({ success: false, error: 'Failed to create reconciliation statement' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = await getActor(request)
    const pdb = getDbForRequest(request)
    const body = await request.json()
    const { id, action, comments, transactionIds } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    const statement = await pdb.bankReconciliationStatement.findUnique({ where: { id: Number(id) } })
    if (!statement) return NextResponse.json({ success: false, error: 'Statement not found' }, { status: 404 })

    if (action === 'approve') {
      const allowed = await assertPermission(pdb, actor, 'BANKRECONCILIATION_APPROVE', { request, module: 'BankReconciliation', entityId: String(id) })
      if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

      if (statement.makerId === actor) {
        return NextResponse.json({ success: false, error: 'Cannot approve your own reconciliation (SoD violation)' }, { status: 403 })
      }

      if (statement.status !== 'Pending') {
        return NextResponse.json({ success: false, error: 'Only pending statements can be approved' }, { status: 400 })
      }

      await pdb.$transaction(async (tx) => {
        await tx.bankReconciliationStatement.update({
          where: { id: Number(id) },
          data: { status: 'Approved', checkerId: actor, approvedAt: new Date() },
        })

        await tx.finApprovalLog.create({
          data: {
            entityType: 'BankReconciliationStatement',
            entityId: String(id),
            status: 'Approved',
            action: 'APPROVE',
            makerId: statement.makerId || '',
            checkerId: actor,
            comments: comments || 'Approved',
            bankReconciliationStatementId: Number(id),
          },
        })
      })

      await pdb.finAccessAuditLog.create({
        data: {
          userEmail: actor,
          module: 'BankReconciliation',
          permissionCode: 'BANKRECONCILIATION_APPROVE',
          action: 'APPROVE',
          entityId: String(id),
          siteCode: null,
          ip: getRequestIp(request),
          success: true,
        },
      })

      return NextResponse.json({ success: true, data: { id: Number(id), status: 'Approved' } })
    }

    if (action === 'reject') {
      const allowed = await assertPermission(pdb, actor, 'BANKRECONCILIATION_APPROVE', { request, module: 'BankReconciliation', entityId: String(id) })
      if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

      if (statement.status !== 'Pending') {
        return NextResponse.json({ success: false, error: 'Only pending statements can be rejected' }, { status: 400 })
      }

      const rejectionReason = comments || 'Rejected by checker'

      await pdb.$transaction(async (tx) => {
        await tx.bankReconciliationStatement.update({
          where: { id: Number(id) },
          data: { status: 'Rejected', checkerId: actor, rejectedAt: new Date(), rejectionReason },
        })

        await tx.bankTransaction.updateMany({
          where: { reconciliationStatementId: Number(id) },
          data: { reconciled: false, reconciliationStatementId: null },
        })

        await tx.finApprovalLog.create({
          data: {
            entityType: 'BankReconciliationStatement',
            entityId: String(id),
            status: 'Rejected',
            action: 'REJECT',
            makerId: statement.makerId || '',
            checkerId: actor,
            comments: rejectionReason,
            bankReconciliationStatementId: Number(id),
          },
        })
      })

      await pdb.finAccessAuditLog.create({
        data: {
          userEmail: actor,
          module: 'BankReconciliation',
          permissionCode: 'BANKRECONCILIATION_APPROVE',
          action: 'REJECT',
          entityId: String(id),
          siteCode: null,
          ip: getRequestIp(request),
          success: true,
        },
      })

      return NextResponse.json({ success: true, data: { id: Number(id), status: 'Rejected' } })
    }

    if (action === 'update_transactions') {
      const allowed = await assertPermission(pdb, actor, 'BANKRECONCILIATION_EDIT', { request, module: 'BankReconciliation', entityId: String(id) })
      if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

      if (statement.status !== 'Draft') {
        return NextResponse.json({ success: false, error: 'Cannot edit transactions for non-draft statement' }, { status: 400 })
      }

      if (!transactionIds || !Array.isArray(transactionIds)) {
        return NextResponse.json({ success: false, error: 'transactionIds array is required' }, { status: 400 })
      }

      await pdb.$transaction(async (tx) => {
        await tx.bankTransaction.updateMany({
          where: { reconciliationStatementId: Number(id) },
          data: { reconciled: false, reconciliationStatementId: null },
        })

        await tx.bankTransaction.updateMany({
          where: { id: { in: transactionIds.map(Number) } },
          data: { reconciled: true, reconciliationStatementId: Number(id) },
        })
      })

      await pdb.finAccessAuditLog.create({
        data: {
          userEmail: actor,
          module: 'BankReconciliation',
          permissionCode: 'BANKRECONCILIATION_EDIT',
          action: 'EDIT',
          entityId: String(id),
          siteCode: null,
          ip: getRequestIp(request),
          success: true,
        },
      })

      return NextResponse.json({ success: true, data: { id: Number(id), updated: transactionIds.length } })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating reconciliation statement:', error)
    return NextResponse.json({ success: false, error: 'Failed to update reconciliation statement' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await getActor(request)
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')
    const statementId = searchParams.get('statementId')

    if (statementId) {
      const allowed = await assertPermission(pdb, actor, 'BANKRECONCILIATION_DELETE', { request, module: 'BankReconciliation', entityId: statementId })
      if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

      const statement = await pdb.bankReconciliationStatement.findUnique({ where: { id: Number(statementId) } })
      if (!statement) return NextResponse.json({ success: false, error: 'Statement not found' }, { status: 404 })

      if (statement.status !== 'Draft') {
        return NextResponse.json({ success: false, error: 'Only draft statements can be deleted' }, { status: 400 })
      }

      await pdb.$transaction(async (tx) => {
        await tx.bankTransaction.updateMany({
          where: { reconciliationStatementId: Number(statementId) },
          data: { reconciled: false, reconciliationStatementId: null },
        })

        await tx.finApprovalLog.deleteMany({ where: { bankReconciliationStatementId: Number(statementId) } })

        await tx.bankReconciliationStatement.delete({ where: { id: Number(statementId) } })
      })

      await pdb.finAccessAuditLog.create({
        data: {
          userEmail: actor,
          module: 'BankReconciliation',
          permissionCode: 'BANKRECONCILIATION_DELETE',
          action: 'DELETE',
          entityId: statementId,
          siteCode: null,
          ip: getRequestIp(request),
          success: true,
        },
      })

      return NextResponse.json({ success: true, data: { deleted: Number(statementId) } })
    }

    if (!transactionId) {
      return NextResponse.json({ success: false, error: 'transactionId or statementId is required' }, { status: 400 })
    }

    const allowed = await assertPermission(pdb, actor, 'BANKRECONCILIATION_EDIT', { request, module: 'BankReconciliation', entityId: transactionId })
    if (!allowed.allowed) return NextResponse.json({ success: false, error: allowed.reason || 'Not allowed' }, { status: 403 })

    const transaction = await pdb.bankTransaction.findUnique({ where: { id: Number(transactionId) } })
    if (!transaction) return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 })

    if (transaction.reconciliationStatementId) {
      const stmt = await pdb.bankReconciliationStatement.findUnique({ where: { id: transaction.reconciliationStatementId } })
      if (stmt && stmt.status !== 'Draft') {
        return NextResponse.json({ success: false, error: 'Cannot un-reconcile transaction from approved/rejected statement' }, { status: 400 })
      }
    }

    const record = await pdb.bankTransaction.update({
      where: { id: Number(transactionId) },
      data: { reconciled: false, reconciliationStatementId: null },
    })

    await pdb.finAccessAuditLog.create({
      data: {
        userEmail: actor,
        module: 'BankReconciliation',
        permissionCode: 'BANKRECONCILIATION_EDIT',
        action: 'UNRECONCILE',
        entityId: transactionId,
        siteCode: null,
        ip: getRequestIp(request),
        success: true,
      },
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error un-reconciling:', error)
    return NextResponse.json({ success: false, error: 'Failed to un-reconcile' }, { status: 500 })
  }
}