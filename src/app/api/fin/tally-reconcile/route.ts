import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { sendToTally } from '@/lib/tally-client'
import { assertPermission } from '@/lib/fin-rbac'

export const dynamic = 'force-dynamic'

// GET: Trial Balance comparison ERP (FinJournalLine by FinAccount) vs Tally Trial Balance
export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const finYear = searchParams.get('finYear') || ''
    const companyName = searchParams.get('company') || process.env.TALLY_COMPANY || 'VoltCore'

    // RBAC: Reconcile requires GL_VIEW or Auditor
    const actor = request.headers.get('x-actor-email') || searchParams.get('actor') || ''
    if (actor) {
      const denied = await assertPermission(pdb, actor, 'GL_VIEW', { request, module: 'GL' } as any)
      if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to reconcile' }, { status: 403 })
    }

    // ERP Trial Balance: sum FinJournalLine by account
    const erpLines = await pdb.finJournalLine.groupBy({
      by: ['accountId'],
      _sum: { debit: true, credit: true },
    })
    const accounts = await pdb.finAccount.findMany({ select: { id: true, accountCode: true, name: true, type: true, group: true } })
    const accMap = new Map(accounts.map(a=>[a.id, a]))

    const erpTB: Array<{ accountCode: string; name: string; debit: number; credit: number; balance: number }> = []
    for (const g of erpLines) {
      const acc = accMap.get(g.accountId)
      if (!acc) continue
      const debit = (g as any)._sum.debit || 0
      const credit = (g as any)._sum.credit || 0
      const balance = debit - credit
      erpTB.push({ accountCode: acc.accountCode, name: acc.name, debit, credit, balance })
    }
    // Include zero-balance accounts for completeness
    for (const acc of accounts) {
      if (!erpTB.find(r=>r.accountCode===acc.accountCode)) {
        erpTB.push({ accountCode: acc.accountCode, name: acc.name, debit: 0, credit: 0, balance: 0 })
      }
    }

    const erpDebitTotal = erpTB.reduce((s,r)=>s+r.debit,0)
    const erpCreditTotal = erpTB.reduce((s,r)=>s+r.credit,0)
    const erpBalanced = Math.abs(erpDebitTotal - erpCreditTotal) < 0.01

    // Tally Trial Balance: fetch via Tally Export (if reachable)
    let tallyTB: Array<{ ledger: string; debit: number; credit: number }> = []
    let tallyAlive = false
    let tallyError = ''
    try {
      const conn = { host: process.env.TALLY_HOST || 'localhost', port: Number(process.env.TALLY_PORT)||9000, timeout: 8000 }
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Trial Balance</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY>
</ENVELOPE>`
      const res = await sendToTally(xml, conn)
      tallyAlive = res.success
      if (res.success) {
        // Parse Tally Trial Balance: look for <LEDGER><NAME> and <CLOSINGBALANCE>
        const ledgerRe = /<LEDGERNAME>([^<]+)<\/LEDGERNAME>[\s\S]*?<CLOSINGBALANCE>([^<]+)<\/CLOSINGBALANCE>/g
        let m: RegExpExecArray | null
        while ((m = ledgerRe.exec(res.rawXml)) !== null) {
          const ledger = m[1].trim()
          const balStr = m[2].trim().replace(/,/g,'')
          const bal = Number(balStr) || 0
          // Tally closing balance: Dr positive, Cr negative? Heuristic: if contains "Cr" then credit
          const isCr = balStr.includes('Cr') || bal < 0
          tallyTB.push({ ledger, debit: isCr ? 0 : Math.abs(bal), credit: isCr ? Math.abs(bal) : 0 })
        }
        if (tallyTB.length === 0) {
          // Fallback: try simpler parse
          const altRe = /<DSPDISPNAME>([^<]+)<\/DSPDISPNAME>[\s\S]*?>([\d,\.\-]+)<\/AMOUNT/g
          while ((m = altRe.exec(res.rawXml)) !== null) {
            tallyTB.push({ ledger: m[1].trim(), debit: Number(m[2].replace(/,/g,''))||0, credit: 0 })
          }
        }
      } else {
        tallyError = res.message
      }
    } catch (e:any) {
      tallyError = e.message
    }

    // Diff
    const diffs: Array<{ accountCode: string; name: string; erpBalance: number; tallyBalance: number | null; diff: number | null; status: string }> = []
    for (const erp of erpTB) {
      const tally = tallyTB.find(t => t.ledger.toLowerCase() === erp.name.toLowerCase() || t.ledger.toLowerCase() === erp.accountCode.toLowerCase())
      const tallyBal = tally ? (tally.debit - tally.credit) : null
      const diff = tallyBal !== null ? erp.balance - tallyBal : null
      const status = tallyBal === null ? 'Missing in Tally' : Math.abs(diff!) < 0.01 ? 'Matched' : 'Diff'
      if (status !== 'Matched' || erp.balance !== 0) {
        diffs.push({ accountCode: erp.accountCode, name: erp.name, erpBalance: erp.balance, tallyBalance: tallyBal, diff, status })
      }
    }
    // Ledgers in Tally but not in ERP
    for (const t of tallyTB) {
      if (!erpTB.find(e=> e.name.toLowerCase()===t.ledger.toLowerCase())) {
        diffs.push({ accountCode: '-', name: t.ledger, erpBalance: 0, tallyBalance: t.debit - t.credit, diff: -(t.debit - t.credit), status: 'Only in Tally' })
      }
    }

    const hasDiff = diffs.some(d=> d.status !== 'Matched')
    const matched = !hasDiff && tallyAlive

    return NextResponse.json({
      success: true,
      data: {
        finYear: finYear || 'All',
        companyName,
        erp: { debitTotal: erpDebitTotal, creditTotal: erpCreditTotal, balanced: erpBalanced, accounts: erpTB.length },
        tally: { alive: tallyAlive, error: tallyError || undefined, ledgers: tallyTB.length, accounts: tallyTB.slice(0,20) },
        diffs: diffs.slice(0,100),
        summary: { diffCount: diffs.filter(d=>d.status!=='Matched').length, matched, hasDiff, tallyAlive },
      }
    })
  } catch (e:any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST: Mark reconciled (writes FinTallySync reconciled=true)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { finYear, companyName, actor } = body
    const pdb = getDbForRequest(request)
    const actorEmail = actor || request.headers.get('x-actor-email') || ''
    const denied = await assertPermission(pdb, actorEmail, 'GL_APPROVE', { request, module: 'GL' } as any)
    if (!denied.allowed) return NextResponse.json({ success: false, error: denied.reason || 'Not allowed to mark reconciled' }, { status: 403 })

    const sync = await pdb.finTallySync.create({
      data: {
        syncType: 'Reconcile',
        fileName: `reconcile-${companyName}-${finYear}-${Date.now()}`,
        totalRows: 0,
        status: 'Completed',
        syncedAt: new Date(),
        direction: 'Export',
        companyName: companyName || 'VoltCore',
        finYear: finYear || '',
        voucherType: 'Reconcile',
        trigger: 'manual',
        actorEmail: actorEmail || null,
        reconciled: true,
        reconciledAt: new Date(),
        log: `Reconciled by ${actorEmail} for ${finYear}`,
      }
    })

    return NextResponse.json({ success: true, data: { id: sync.id, reconciled: true } })
  } catch (e:any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
