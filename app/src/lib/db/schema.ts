import {
  pgTable, uuid, text, boolean, integer, numeric,
  date, timestamp, jsonb, type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import type { LayoutItem } from '@/types'

export const items = pgTable('items', {
  id:        uuid('id').primaryKey().defaultRandom(),
  kind:      text('kind').notNull(),
  body:      text('body').notNull(),
  src:       text('src'),
  author:    text('author'),
  parentId:  uuid('parent_id').references((): AnyPgColumn => items.id),
  starred:   boolean('starred').notNull().default(false),
  tags:      text('tags').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const itemReminder = pgTable('item_reminder', {
  itemId:   uuid('item_id').primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  due:      text('due').notNull(),
  priority: integer('priority').notNull().default(3),
  done:     boolean('done').notNull().default(false),
})

export const itemFunnel = pgTable('item_funnel', {
  itemId:    uuid('item_id').primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  mediaKind: text('media_kind').notNull(),
  source:    text('source').notNull(),
  est:       text('est').notNull(),
  queueTag:  text('queue_tag').notNull(),
})

export const itemFocus = pgTable('item_focus', {
  itemId:          uuid('item_id').primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  startedAt:       timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt:         timestamp('ended_at', { withTimezone: true }),
  durationMinutes: integer('duration_minutes'),
})

export const itemMessage = pgTable('item_message', {
  itemId:      uuid('item_id').primaryKey().references(() => items.id, { onDelete: 'cascade' }),
  who:         text('who').notNull(),
  messageKind: text('message_kind'),
  reactions:   jsonb('reactions').$type<Array<{ e: string; n: number }>>(),
  linkMeta:    jsonb('link_meta').$type<{ title: string; site: string; desc: string }>(),
  done:        boolean('done'),
})

export const workspaces = pgTable('workspaces', {
  id:     uuid('id').primaryKey().defaultRandom(),
  name:   text('name').notNull().unique(),
  layout: jsonb('layout').notNull().$type<LayoutItem[]>(),
})

export const activity = pgTable('activity', {
  date:            date('date').primaryKey(),
  count:           integer('count').notNull().default(0),
  sourceBreakdown: jsonb('source_breakdown').notNull().default({}).$type<Record<string, number>>(),
})

export const calendarEvents = pgTable('calendar_events', {
  id:         uuid('id').primaryKey().defaultRandom(),
  title:      text('title').notNull(),
  kind:       text('kind').notNull(),
  dayOfWeek:  integer('day_of_week').notNull(),
  startHour:  numeric('start_hour').notNull(),
  endHour:    numeric('end_hour').notNull(),
  weekStart:  date('week_start').notNull(),
  isCurrent:  boolean('is_current').notNull().default(false),
})
