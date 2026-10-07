# OmniCalc Pro — Scientific & Financial Calculation Suite

An autonomous, multi-disciplinary computational suite engineered for precision arithmetic, trigonometric analysis, loan amortization modeling, and dimensional unit conversion.

## System Architecture & System Design

OmniCalc Pro implements a decoupled state-machine architecture separating mathematical evaluation, IEEE 754 precision safeguards, and responsive reactive presentation:

```
+-------------------------------------------------------------------------+
|                              OmniCalc Pro                               |
+-------------------------------------------------------------------------+
       |                                              |
       v                                              v
+-----------------------------+              +-----------------------------+
|   Interactive UI Engine     |              |     Math & Finance Core     |
| - Standard Keypad Matrix    |              | - Tokenizer & Precedence    |
| - Scientific Trig Ribbon    | <----------> | - IEEE 754 Rounding Formatter|
| - Loan Amortization Matrix  |              | - Loan EMI Formula Engine   |
| - Bidirectional Converter   |              | - Dimensional Unit Vectors  |
+-----------------------------+              +-----------------------------+
       |                                              |
       +----------------------+-----------------------+
                              v
                +---------------------------+
                |  Persistent Memory Bank   |
                | - Registers (MC, MR, M±)  |
                | - Timestamped Audit Log   |
                | - Keyboard Dispatcher     |
                +---------------------------+
```

## Functional Capabilities

1. **Standard Arithmetic Engine**:
   - Four-function basic operations with order of operations (BODMAS).
   - Parenthetical sub-expressions, percentages, sign toggling, and floating-point error truncation.

2. **Scientific & Engineering Suite**:
   - Trigonometry: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`.
   - Degree / Radian toggle switch (`DEG` vs `RAD`).
   - Logarithms: Natural logarithm (`ln`) and Common logarithm (`log10`).
   - Exponential & Powers: `xʸ`, `x²`, `√x`, reciprocal (`1/x`), factorial (`n!`).
   - Mathematical Constants: Archimedes' Constant `π` and Euler's Number `e`.

3. **Financial Loan & EMI Amortization**:
   - Computes Equated Monthly Installment (`EMI`) using standard financial amortization formulas:
     $$EMI = \frac{P \times r \times (1 + r)^n}{(1 + r)^n - 1}$$
   - Dynamic real-time sliders for Principal ($10k - $1M), Interest Rate (1% - 20%), and Tenure (1 - 40 Years).
   - Breakdowns for Total Interest, Total Repayment Amount, Principal-to-Interest visual ratio, and a monthly amortization table.

4. **Dimensional Unit Converter**:
   - Length: Meters, Kilometers, Centimeters, Feet, Inches, Miles, Yards.
   - Mass: Kilograms, Grams, Pounds, Ounces, Metric Tons.
   - Temperature: Celsius, Fahrenheit, Kelvin.
   - Digital Storage: Bytes, KB, MB, GB, TB.

5. **Hardware & Usability Integrations**:
   - Tactile keyboard event listeners for rapid calculations.
   - Dual-line OLED display showing calculation history and active operand.
   - Click-to-copy result clipboard integration.
   - Persistent calculation audit trail with recall and clear capabilities.

## Verification & Testing Suite

Automated validation is verified across all mathematical modules via bun test:
```bash
bun test tests/calculator.test.ts
```
