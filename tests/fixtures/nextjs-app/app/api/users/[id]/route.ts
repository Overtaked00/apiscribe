import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({ id: params.id, name: 'Test User' });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return new NextResponse(null, { status: 204 });
}
