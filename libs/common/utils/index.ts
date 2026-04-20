export class MoneyTransformer {
  private static readonly SCALE = 100n;

  // convert DB BigInt to Human String: 5000n -> "50.00"
  static toDecimalString(minorAmount: bigint): string {
    const major = minorAmount / this.SCALE;
    const minor = minorAmount % this.SCALE;
    // padStart ensures 5005n becomes "50.05" and not "50.5"
    return `${major}.${minor.toString().padStart(2, '0')}`;
  }

  // convert Human Input to DB BigInt: "50.00" -> 5000n
  static toMinorUnit(amount: number | string): bigint {
    return BigInt(Math.round(Number(amount) * 100));
  }
}
