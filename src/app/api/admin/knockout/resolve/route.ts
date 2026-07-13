import { NextResponse } from 'next/server';
import { resolveKnockoutBrackets } from '@/lib/knockout-resolver';

export async function POST() {
  try {
    const { resolved, skipped } = await resolveKnockoutBrackets();

    return NextResponse.json({
      success: true,
      resolved,
      skipped,
      message: resolved.length === 0 && skipped.length === 0
        ? 'No hay cruces pendientes de resolución.'
        : `Se resolvieron ${resolved.length} cruces. ${skipped.length} siguen esperando resultados.`,
    });
  } catch (err: any) {
    console.error('Knockout resolve error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
