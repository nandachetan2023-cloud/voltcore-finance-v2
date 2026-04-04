import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: List all knowledge base articles
export async function GET() {
  try {
    const articles = await db.kBArticle.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: { articles } })
  } catch (error) {
    console.error('Error fetching knowledge base articles:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch knowledge base articles' },
      { status: 500 }
    )
  }
}

// POST: Create knowledge base article
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.title || !body.content) {
      return NextResponse.json(
        { success: false, error: 'title and content are required' },
        { status: 400 }
      )
    }

    const article = await db.kBArticle.create({
      data: body,
    })

    return NextResponse.json({ success: true, data: article }, { status: 201 })
  } catch (error) {
    console.error('Error creating knowledge base article:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create knowledge base article' },
      { status: 500 }
    )
  }
}

// PUT: Update knowledge base article by id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.kBArticle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Knowledge base article not found' },
        { status: 404 }
      )
    }

    const article = await db.kBArticle.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: article })
  } catch (error) {
    console.error('Error updating knowledge base article:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update knowledge base article' },
      { status: 500 }
    )
  }
}

// DELETE: Delete knowledge base article by id
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existing = await db.kBArticle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Knowledge base article not found' },
        { status: 404 }
      )
    }

    await db.kBArticle.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting knowledge base article:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete knowledge base article' },
      { status: 500 }
    )
  }
}
