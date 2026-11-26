import type { AstroCookies } from 'astro';

// Só na branch de proposta: as três propostas de interface, alternáveis por
// ?tema=a|b|c (o middleware guarda a escolha num cookie). Depois da escolha,
// a proposta escolhida vira o visual único e este arquivo sai.
export const TEMAS = ['atual', 'a', 'b', 'c'] as const;
export type Tema = (typeof TEMAS)[number];

export const NOMES_TEMAS: Record<Tema, string> = {
  atual: 'Atual',
  a: 'A: atual revisto',
  b: 'B: periódico',
  c: 'C: índice lateral',
};

export const ehTema = (v: unknown): v is Tema => typeof v === 'string' && (TEMAS as readonly string[]).includes(v);

export function temaDe(cookies: AstroCookies): Tema {
  const valor = cookies.get('tema')?.value;
  return ehTema(valor) ? valor : 'atual';
}
