"""
Grounding and Unseen Numbers Validator
Ensures LLM explanations and assistant responses contain ONLY numbers present
in the user's input context or standard calendar/ratio constants.
Prevents hallucination of fake metrics, ROI claims, or fabricated percentages.
"""
import re
from typing import Any

# Permitted domain constants that are standard calendar or ratio foundations
ALLOWED_CONSTANTS: set[float] = {
    0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, # days in week, small counts
    12.0, 24.0, 48.0, 60.0, 90.0, 168.0, 365.0, # hours/minutes/days in calendar
    100.0 # base 100 percentage denominator
}

def extract_numbers_from_text(text: str) -> list[float]:
    """
    Extracts all numeric tokens from text, parsing integers, floats, and percentages.
    E.g. '85.5%', '42', '0.65', '14.2'
    """
    if not text:
        return []
    
    # Matches patterns like 42, 3.14, 85%, +10, -0.5
    raw_matches = re.findall(r'(?<![A-Za-z0-9_])([+-]?\d+(?:\.\d+)?)(%?)', text)
    numbers: list[float] = []
    
    for val_str, is_pct in raw_matches:
        try:
            val = float(val_str)
            numbers.append(val)
            # If formatted as a percentage like 85%, also store decimal 0.85
            if is_pct:
                numbers.append(val / 100.0)
            elif 0.0 <= val <= 1.0:
                # If decimal like 0.85, also store 85.0
                numbers.append(round(val * 100.0, 2))
        except ValueError:
            continue
            
    return numbers

def build_context_numbers(context: Any) -> set[float]:
    """
    Recursively scans input context (dict, list, primitives) and collects all numeric values.
    """
    numbers: set[float] = set(ALLOWED_CONSTANTS)
    
    def _collect(val: Any):
        if isinstance(val, (int, float)):
            v = float(val)
            numbers.add(round(v, 4))
            numbers.add(round(v, 2))
            numbers.add(round(v, 1))
            numbers.add(float(int(v)))
            if 0.0 <= v <= 1.0:
                numbers.add(round(v * 100.0, 2))
                numbers.add(round(v * 100.0, 1))
                numbers.add(float(int(round(v * 100.0))))
            elif 0.0 <= v <= 100.0:
                numbers.add(round(v / 100.0, 4))
                numbers.add(round(v / 100.0, 2))
        elif isinstance(val, str):
            for n in extract_numbers_from_text(val):
                numbers.add(round(n, 4))
                numbers.add(round(n, 2))
                numbers.add(float(int(n)))
        elif isinstance(val, dict):
            for v in val.values():
                _collect(v)
        elif isinstance(val, (list, tuple, set)):
            for item in val:
                _collect(item)
                
    _collect(context)
    return numbers

def validate_unseen_numbers(
    generated_text: str,
    context: Any,
    tolerance: float = 1e-2
) -> tuple[bool, list[float]]:
    """
    Validates that every number present in generated_text is grounded in context.
    Returns (is_valid, list_of_unseen_numbers).
    """
    context_numbers = build_context_numbers(context)
    generated_numbers = extract_numbers_from_text(generated_text)
    
    unseen: list[float] = []
    
    for num in generated_numbers:
        # Check if number matches any known context number within tolerance
        matched = any(abs(num - c) <= tolerance for c in context_numbers)
        if not matched:
            unseen.append(num)
            
    return (len(unseen) == 0, unseen)
