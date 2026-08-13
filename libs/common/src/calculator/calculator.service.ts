import { Injectable, Scope } from '@nestjs/common';
import Big, { BigSource } from 'big.js';

/**
 * Represents a calculator using Big.js for precise decimal arithmetic.
 * Configured for 20 decimal places and bankers rounding by default.
 * Scope.TRANSIENT ensures instance isolation to prevent configuration leakage.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class Calculator {
  private readonly DEFAULT_DP = 20;
  private readonly DEFAULT_ROUNDING_MODE = Big.roundHalfEven; // Value: 2

  constructor() {
    this.resetToDefaults();
  }

  /**
   * Resets the global Big.js configuration to the class defaults.
   */
  private resetToDefaults(): void {
    Big.DP = this.DEFAULT_DP;
    Big.RM = this.DEFAULT_ROUNDING_MODE;
  }

  /**
   * Converts a value to its minor unit (bigint) based on a scale (default 100 for 2DP).
   * Useful for converting Calculator results back to DB BigInts.
   */
  toMinor(num: BigSource, scale = 100): bigint {
    const bigNum = new Big(num);
    return BigInt(bigNum.times(scale).round(0).toFixed());
  }

  /** Adds two numbers. */
  add(num1: BigSource, num2: BigSource): string {
    const bigNum1 = new Big(num1);
    const bigNum2 = new Big(num2);
    return bigNum1.plus(bigNum2).toFixed(Big.DP);
  }

  /** Adds multiple numbers together. */
  addMany(...numbers: BigSource[]): string {
    if (numbers.length === 0) {
      throw new Error('At least one number must be provided.');
    }
    const sum = numbers.reduce<Big>(
      (acc, num) => acc.plus(new Big(num)),
      new Big(0),
    );
    return sum.toFixed(Big.DP);
  }

  /** Subtracts the second number from the first. */
  subtract(num1: BigSource, num2: BigSource): string {
    const bigNum1 = new Big(num1);
    const bigNum2 = new Big(num2);
    return bigNum1.minus(bigNum2).toFixed(Big.DP);
  }

  /** Multiplies two numbers. */
  multiply(num1: BigSource, num2: BigSource): string {
    const bigNum1 = new Big(num1);
    const bigNum2 = new Big(num2);
    return bigNum1.times(bigNum2).toFixed(Big.DP);
  }

  /** Divides the first number by the second. */
  divide(num1: BigSource, num2: BigSource): string {
    const bigNum1 = new Big(num1);
    const bigNum2 = new Big(num2);
    if (bigNum2.eq(0)) {
      throw new Error('Division by zero is not allowed.');
    }
    return bigNum1.div(bigNum2).toFixed(Big.DP);
  }

  /** Rounds a number to the configured decimal places using bankers rounding. */
  round(
    num: BigSource,
    dp = this.DEFAULT_DP,
    rm = this.DEFAULT_ROUNDING_MODE,
  ): string {
    const bigNum = new Big(num);
    return bigNum.round(dp, rm).toFixed(dp);
  }

  /** Converts BigSource to native number (use with caution in fintech). */
  toNumber(num: BigSource): number {
    return new Big(num).toNumber();
  }

  /**
   * Compare two values.
   * Returns: -1 (num1 < num2), 0 (num1 = num2), 1 (num1 > num2)
   */
  compare(num1: BigSource, num2: BigSource): number {
    return new Big(num1).cmp(new Big(num2));
  }

  /** Returns absolute value. */
  abs(num: BigSource): string {
    return new Big(num).abs().toFixed(Big.DP);
  }

  /** Sets global Big.js settings. */
  setConfig(
    decimalPlaces = this.DEFAULT_DP,
    roundingMode = this.DEFAULT_ROUNDING_MODE,
  ): void {
    Big.DP = decimalPlaces;
    Big.RM = roundingMode;
  }

  /**
   * Sets the global decimal places for Big.js operations.
   */
  set decimalPlaces(value: number) {
    Big.DP = value;
  }

  get decimalPlaces(): number {
    return Big.DP;
  }

  /**
   * Sets the global rounding mode for Big.js operations.
   */
  set roundingMode(value: number) {
    Big.RM = value;
  }

  get roundingMode(): number {
    return Big.RM;
  }
}
