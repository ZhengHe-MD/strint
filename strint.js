;(function(globalObject) {
  'use strict';

  var strint = {};

  var e = strint;

  //------------------- Addition

  var subNonNegative = e.subNonNegative = function (x, y) {
    forceNonNegativeString(x);
    forceNonNegativeString(y);
    forceNormalized(x);
    forceNormalized(y);

    if (!ge(x, y)) {
      throw new Error("x must be greater or equal to y");
    }
    // short cut
    if (isZero(y)) {
      return x;
    }

    var maxLength = Math.max(x.length, y.length);
    var result = "";
    var borrow = 0;
    var leadingZeroCount = 0;
    for (var i=0; i < maxLength; i++) {
      var lhs = Number(getDigit(x, i)) - borrow;
      borrow = 0;
      var rhs = Number(getDigit(y, i));
      if (lhs < rhs) {
        lhs += 10;
        borrow = 1;
      }
      var digit = String(lhs - rhs);
      if (digit !== "0") {
        result = digit + prefixZeros(result, leadingZeroCount);
        leadingZeroCount = 0;
      } else {
        leadingZeroCount++;
      }
    }
    return result.length === 0 ? "0" : result;
  }

  var addNonNegative = e.addNonNegative = function(x, y) {
    forceNonNegativeString(x);
    forceNonNegativeString(y);
    forceNormalized(x);
    forceNormalized(y);

    if (isZero(x)) { return y }
    if (isZero(y)) { return x }

    var maxLength = Math.max(x.length, y.length);
    var result = "";
    var borrow = 0;
    for (var i = 0; i < maxLength; i++) {
      var lhs = Number(getDigit(x, i));
      var rhs = Number(getDigit(y, i));
      var digit = lhs + rhs + borrow;
      borrow = 0;

      if (digit >= 10) {
        borrow = 1;
        digit -= 10;
      }

      result = String(digit) + result;
    }

    if (borrow === 1) {
      result = "1" + result;
    }

    return result;
  }

  var add = e.add = function (x, y) {
    forceString(x);
    forceString(y);

    x = normalize(x);
    y = normalize(y);

    if (isNonNegative(x) && isNonNegative(y)) {
      return addNonNegative(x, y);
    } else if (isNegative(x) && isNegative(y)) {
      return negate(addNonNegative(abs(x), abs(y)));
    } else {
      var lhs, rhs, resultIsPositive;
      var xAbs = lhs = abs(x);
      var yAbs = rhs = abs(y);
      resultIsPositive = isNonNegative(x);

      if (lt(xAbs, yAbs)) {
        lhs = yAbs;
        rhs = xAbs;
        resultIsPositive = isNonNegative(y);
      }

      // lhs >= rhs
      var absResult = subNonNegative(lhs, rhs);
      return resultIsPositive ? absResult : negate(absResult);
    }
  }

  var sub = e.sub = function (x, y) {
    forceString(x);
    forceString(y);
    x = normalize(x);
    y = normalize(y);
    return add(x, negate(y));
  }

  //------------------- Multiplication
  var mulDigit = e.mulDigit = function (strint, digit) {
    forceNonNegativeString(strint);
    forceDigit(digit);

    if (digit === 0) {
      return "0";
    }

    var result = "";
    var carry = 0;
    var digitCount = strint.length;
    var leadingZeroCount = 0;
    for (var i = 0; i < digitCount; i++) {
      var newDigit = Number(getDigit(strint, i)) * digit + carry;
      carry = 0;
      while (newDigit >= 10) {
        newDigit -= 10;
        carry++;
      }

      if (newDigit === 0) {
        leadingZeroCount++;
      } else {
        result = String(newDigit) + prefixZeros(result, leadingZeroCount);
        leadingZeroCount = 0;
      }
    }

    if (carry > 0) {
      result = String(carry) + result;
    }

    return result === "" ? "0" : result;
  }

  var mulPositive = e.mulPositive = function(lhs, rhs) {
    /* Example via http://en.wikipedia.org/wiki/Multiplication_algorithm
            23958233
                5830 ×
        ------------
            00000000 ( =      23,958,233 ×     0)
           71874699  ( =      23,958,233 ×    30)
         191665864   ( =      23,958,233 ×   800)
        119791165    ( =      23,958,233 × 5,000)
        ------------
        139676498390 ( = 139,676,498,390        )
     */
    forceNonNegativeString(lhs);
    forceNonNegativeString(rhs);
    // also assume normalized
    forceNormalized(lhs);
    forceNormalized(rhs);

    var result = "0";
    var rhsLength = getDigitCount(rhs);
    for (var i = 0; i < rhsLength; i++) {
      var mulDigitRes = mulDigit(lhs, Number(getDigit(rhs, i)));
      result = addNonNegative(result, normalize(shiftLeft(mulDigitRes, i)));
    }
    return result;
  }

  var mul = e.mul = function(lhs, rhs) {
    forceString(lhs);
    forceString(rhs);

    lhs = normalize(lhs);
    rhs = normalize(rhs);

    var absRes = mulPositive(abs(lhs), abs(rhs));

    var product = sameSign(lhs, rhs) ? absRes : negate(absRes);
    return normalize(product);
  }

  var nativeMul = function(lhs, rhs) {
    return parseInt(lhs) * parseInt(rhs);
  }

  var CUTOFF = 8 // sqrt(2^53 - 1) = 94906265

  var karatsubaMulNonNegative = e.karatsubaMulNonNegative = function(lhs, rhs) {
    forceNonNegativeString(lhs);
    forceNonNegativeString(rhs);

    var lhsNorm = normalize(lhs);
    var rhsNorm = normalize(rhs);

    var ll = lhsNorm.length;
    var rl = rhsNorm.length;

    if (ll < CUTOFF && rl < CUTOFF) {
      return nativeMul(lhsNorm, rhsNorm).toString();
    } else {
      var len = Math.max(ll, rl);
      var half = Math.floor(len / 2);
      var leftHalf = len - half;

      var paddedLhs = leftPadZeros(lhsNorm, len);
      var paddedRhs = leftPadZeros(rhsNorm, len);

      var lhsNormHigh = paddedLhs.slice(0, leftHalf);
      var lhsNormLow = paddedLhs.slice(leftHalf);
      var rhsNormHigh = paddedRhs.slice(0, leftHalf);
      var rhsNormLow = paddedRhs.slice(leftHalf);

      var a = karatsubaMulNonNegative(lhsNormHigh, rhsNormHigh);
      var c = karatsubaMulNonNegative(lhsNormLow, rhsNormLow);
      var b = karatsubaMulNonNegative(add(lhsNormHigh, lhsNormLow), add(rhsNormHigh, rhsNormLow));
      b = sub(sub(b, a), c);

      // multiple 10^(2*half)
      for (var i = 0; i < 2 * half; i++) a = a + '0';
      // multiple 10^(half)
      for (var i = 0; i < half; i++) b = b + '0';

      return add(add(a, b), c);
    }
  }

  var karatsubaMul = e.karatsubaMul = function(lhs, rhs) {
    forceString(lhs);
    forceString(rhs);

    var absRes = karatsubaMulNonNegative(abs(lhs), abs(rhs));
    var product = sameSign(lhs, rhs) ? absRes : negate(absRes);
    return normalize(product);
  }

  //------------------- Division

  var quotientRemainderPositive = e.quotientRemainderPositive = function (dividend, divisor) {
    /*
      Example division: 290 / 15

      29|0 = 0  // digits larger, can subtract
      15

      14|0 = 1  // digits smaller, must shift
      15

      140| = 10  // digits are 140, can subtract 9 times
       15

      (9 subtractions omitted)

        5| = 19  // divisor is now larger than the dividend, we are done: [19, 5]
       15
     */
    forceNonNegativeString(dividend);
    forcePositiveString(divisor);
    forceNormalized(dividend);
    forceNormalized(divisor);

    if (eq(dividend, divisor)) {
      return ["1", "0"];
    }

    if (lt(dividend, divisor)) {
      return ["0", dividend];
    }

    var quotient = "0";
    var remainingDigits = dividend.length - divisor.length;

    while(true) {
      var dividendPart = dividend.slice(0, dividend.length - remainingDigits);

      while(ge(dividendPart, divisor)) {
        dividendPart = sub(dividendPart, divisor);
        quotient = add(quotient, "1");
      }

      dividend = dividendPart + dividend.slice(dividend.length - remainingDigits);

      // Done already?
      if (gt(divisor, dividend)) { // holds (at the lastest) at remainingDigits === 0
        quotient = shiftLeft(quotient, remainingDigits);
        return [ quotient, normalize(dividend) ];
      }

      // Not done, shift
      remainingDigits--;
      quotient = shiftLeft(quotient, 1);
    }
  }

  var div = e.div = function (dividend, divisor) {
    forceString(dividend);
    forceString(divisor);

    var dividendNorm = normalize(dividend);
    var divisorNorm = normalize(divisor);

    var absResult = quotientRemainderPositive(abs(dividendNorm), abs(divisorNorm))[0];
    return (sameSign(dividendNorm, divisorNorm) ? absResult : negate(absResult));
  }

  // comparison

  var eq = e.eq = function(lhs, rhs) {
    return normalize(lhs) === normalize(rhs);
  }

  var lt = e.lt = function(lhs, rhs) {
    var lhsNorm = normalize(lhs);
    var rhsNorm = normalize(rhs);

    if (isNegative(lhsNorm) && isNonNegative(rhsNorm)) {
      return true;
    } else if (isNonNegative(lhsNorm) && isNegative(rhsNorm)) {
      return false;
    } else if (isNegative(lhsNorm) && isNegative(rhsNorm)) {
      return ltNonNegative(abs(rhsNorm), abs(lhsNorm));
    } else {
      return ltNonNegative(lhsNorm, rhsNorm);
    }
  }

  var ltNonNegative = e.ltNonNegative = function(lhsNorm, rhsNorm) {
    forceNonNegativeString(lhsNorm);
    forceNonNegativeString(rhsNorm);

    var maxLength = Math.max(lhsNorm.length, rhsNorm.length);
    var lhs = leftPadZeros(lhsNorm, maxLength);
    var rhs = leftPadZeros(rhsNorm, maxLength);
    return lhs < rhs;
  }

  var ge = e.ge = function(lhs, rhs) {
    return !lt(lhs, rhs);
  }

  var gt = e.gt = function(lhs, rhs) {
    return eq(lhs, rhs) ? false : ge(lhs, rhs);
  }

  // signs
  var isNegative = e.isNegative = function(strint) {
    forceString(strint);
    return !isZero(strint) && (strint.indexOf("-") === 0);
  }

  var isNonNegative = e.isNonNegative = function(strint) {
    return !isNegative(strint)
  }

  var abs = e.abs = function(strint) {
    if (isZero(strint)) {
      return "0"
    } else {
      return isNegative(strint) ? negate(strint) : strint;
    }
  }

  var isZero = e.isZero = function(strint) {
    return normalize(strint) === "0";
  }

  function sameSign(lhs, rhs) {
    return isNonNegative(lhs) === isNonNegative(rhs);
  }

  var negate = e.negate = function(strint) {
    var condition = isZero(strint) ? strint.indexOf("-") === 0 : isNegative(strint);
    return condition ? strint.slice(1) : "-" + strint;
  }

  // Helpers
  var RE_NON_ZERO = /^(-?)0*([1-9][0-9]*)$/;
  var RE_ZERO = /^(-?)0+$/;
  var normalize = e.normalize = function (strint) {
    if (RE_ZERO.test(strint)) {
      return "0";
    }
    var match = RE_NON_ZERO.exec(strint);
    if (!match) {
      throw new Error("Illegal strint format: " + strint);
    }
    return match[1] + match[2];
  }

  // prefix zeros
  var leftPadZeros = function (strint, totalLength) {
    forceNonNegativeString(strint);
    forceNonNegativeNumber(totalLength);

    return prefixZeros(strint, totalLength - strint.length)
  }

  var prefixZeros = function (strint, zeroCount) {
    var result = strint;
    for (var i = 0; i < zeroCount; i++) {
      result = "0" + result;
    }
    return result;
  }

  var shiftLeft = function(strint, digitCount) {
    while(digitCount > 0) {
      strint += "0";
      digitCount--;
    }
    return strint;
  }

  // going too far left results in "0"
  var getDigit = function(strint, digitIndex) {
    forceString(strint);
    forceNumber(digitIndex);
    if (digitIndex >= getDigitCount(strint)) {
      return "0"
    } else {
      return strint.charAt(strint.length - digitIndex - 1);
    }
  }

  var getDigitCount = function(strint) {
    return isNegative(strint) ? strint.length - 1 : strint.length;
  }

  // type checking utils
  function forceType(value, type) {
    if (typeof value !== type) {
      throw new Error("Not a " + type + ": " + value);
    }
  }

  function forceString(value) {
    forceType(value, "string");
  }

  function forceCondition(value, condition, conditionName) {
    if (!condition.call(null, value)) {
      throw new Error("Condition " + conditionName + "failed for value" + value);
    }
  }

  function forceNonNegativeString(value) {
    forceString(value);
    forceCondition(value, isNonNegative, "isNonNegative");
  }

  function forcePositiveString(value) {
    forceNonNegativeString(value);
    if (isZero(value)) {
      throw new Error("Expected a positive number string");
    }
  }

  function forceDigit(digit) {
    forceNumber(digit);
    if (digit < 0 || digit > 9 || Math.floor(digit) !== digit) {
      throw new Error("Expected a digit from 0-9");
    }
  }

  function forceNumber(value) {
    forceType(value, "number");
  }

  function forceNonNegativeNumber(value) {
    forceType(value, "number");
    if (value < 0) {
      throw new Error("Expected a positive number: " + value);
    }
  }

  function forceNormalized(strint) {
    if (normalize(strint) !== strint) {
      throw new Error("Expected strint in normalized form");
    }
  }

  globalObject.strint = e;

})(this)