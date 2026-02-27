import { BonusSource, DiceBankEntry } from '../types/game';

let _seq = 0;
/** Create a new dice bank entry with a monotonically increasing sequence. */
export function createBankEntry(
  value: number,
  source: BonusSource,
  sequence?: number,
): DiceBankEntry {
  return {
    id: `die_${Date.now()}_${++_seq}`,
    value,
    source,
    createdAtSequence: sequence ?? _seq,
  };
}

/** Roll a single d6 and return the value. */
export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Roll an initial die, then chain-roll for every 6 that appears.
 * Returns an array of DiceBankEntry with correct sources.
 * The first roll is 'BASE'; each subsequent bonus roll from a 6 is 'ROLL_6_BONUS'.
 *
 * Caps the chain at 5 to prevent runaway bonus accumulation.
 */
export function rollAndBuildBank(startSequence: number): DiceBankEntry[] {
  const entries: DiceBankEntry[] = [];
  let seq = startSequence;
  let source: BonusSource = 'BASE';
  let roll = rollD6();
  let chainCount = 0;
  const MAX_CHAIN = 5;

  while (true) {
    entries.push(createBankEntry(roll, source, seq++));
    if (roll === 6 && chainCount < MAX_CHAIN) {
      source = 'ROLL_6_BONUS';
      roll = rollD6();
      chainCount++;
    } else {
      break;
    }
  }

  return entries;
}

/**
 * Roll a single bonus die (arrow or kill bonus) and return a bank entry.
 */
export function rollBonusDie(
  source: 'ARROW_BONUS' | 'KILL_BONUS',
  sequence: number,
): DiceBankEntry {
  return createBankEntry(rollD6(), source, sequence);
}

/** Sum of all dice values in the bank. */
export function sumBank(bank: DiceBankEntry[]): number {
  return bank.reduce((acc, e) => acc + e.value, 0);
}

/** Remove a specific die from the bank by id. Throws if not found. */
export function removeDieFromBank(bank: DiceBankEntry[], id: string): DiceBankEntry[] {
  const idx = bank.findIndex(e => e.id === id);
  if (idx === -1) throw new Error(`Bank die not found: ${id}`);
  const copy = [...bank];
  copy.splice(idx, 1);
  return copy;
}

/** Return the first bank entry that is legal for some move (used for auto-pick). */
export function findFirstUsableDie(
  bank: DiceBankEntry[],
  isUsable: (entry: DiceBankEntry) => boolean,
): DiceBankEntry | null {
  return bank.find(isUsable) ?? null;
}
