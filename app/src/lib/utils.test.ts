import { describe, test, expect } from 'vitest'
import { weekStartFor, relativeTime, isLongText } from './utils'

describe('weekStartFor', () => {
  // Wednesday 2026-05-20 noon UTC — getDay()=3, dow=(3+6)%7=2 → Monday=May 18
  const wed = new Date('2026-05-20T12:00:00.000Z')

  test('offset 0 returns Monday of current week', () => {
    expect(weekStartFor(0, wed)).toBe('2026-05-18')
  })
  test('offset +1 returns next Monday', () => {
    expect(weekStartFor(1, wed)).toBe('2026-05-25')
  })
  test('offset -1 returns previous Monday', () => {
    expect(weekStartFor(-1, wed)).toBe('2026-05-11')
  })
})

describe('relativeTime', () => {
  test('< 1 minute returns "just now"', () => {
    const d = new Date(Date.now() - 30_000)
    expect(relativeTime(d)).toBe('just now')
  })
  test('45 minutes ago returns "45m ago"', () => {
    const d = new Date(Date.now() - 45 * 60_000)
    expect(relativeTime(d)).toBe('45m ago')
  })
  test('3 hours ago returns "3h ago"', () => {
    const d = new Date(Date.now() - 3 * 3_600_000)
    expect(relativeTime(d)).toBe('3h ago')
  })
  test('2 days ago returns "2d ago"', () => {
    const d = new Date(Date.now() - 2 * 86_400_000)
    expect(relativeTime(d)).toBe('2d ago')
  })
})

describe('isLongText', () => {
  test('short single-line text is not long', () => {
    expect(isLongText('Hello world')).toBe(false)
  })

  test('text with more than 5 explicit newlines is long', () => {
    expect(isLongText('a\nb\nc\nd\ne\nf')).toBe(true)
  })

  test('very long single-line text is long', () => {
    expect(isLongText('x'.repeat(500))).toBe(true)
  })

  test('text at exactly the threshold is not long', () => {
    // 5 short lines → 5 visual lines, not > 5
    expect(isLongText('a\nb\nc\nd\ne')).toBe(false)
  })

  test('one more line than threshold is long', () => {
    expect(isLongText('a\nb\nc\nd\ne\nf')).toBe(true)
  })

  test('respects custom threshold', () => {
    expect(isLongText('a\nb\nc', 2)).toBe(true)
    expect(isLongText('a\nb', 2)).toBe(false)
  })
})
