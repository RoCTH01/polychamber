import { describe, test, expect } from 'vitest'
import { parseLinks } from './parseLinks'

describe('parseLinks', () => {
  test('returns empty array for empty string', () => {
    expect(parseLinks('')).toEqual([])
  })

  test('returns empty array when no tokens present', () => {
    expect(parseLinks('hello world **bold** #tag')).toEqual([])
  })

  test('parses a single inline link token', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    expect(parseLinks(`before [[${id}:My Note]] after`)).toEqual([
      { uuid: id, title: 'My Note' },
    ])
  })

  test('parses multiple tokens', () => {
    const id1 = '550e8400-e29b-41d4-a716-446655440000'
    const id2 = '550e8400-e29b-41d4-a716-446655440001'
    expect(parseLinks(`[[${id1}:Note A]] and [[${id2}:Note B]]`)).toEqual([
      { uuid: id1, title: 'Note A' },
      { uuid: id2, title: 'Note B' },
    ])
  })

  test('ignores malformed tokens without colon', () => {
    expect(parseLinks('[[notauuid]]')).toEqual([])
  })

  test('handles empty title', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    expect(parseLinks(`[[${id}:]]`)).toEqual([{ uuid: id, title: '' }])
  })
})
