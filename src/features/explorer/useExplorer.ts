import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { EventKind, RepositorySnapshot, TimelineEvent } from '../../domain/types'
import type { GitHubBundle } from '../../data/github/types'
import { DEMO_EVENTS, DEMO_REPOSITORY } from '../../data/sample/demo'
import { fetchRepository, GitHubRequestError, loadEarlierHistory, parseRepositoryInput } from '../../data/github/client'
import { normalizeBundle } from '../../data/github/normalize'
import { buildWorldState, relativePercent, timelineBounds } from '../../domain/timeline'
import { formatDate } from '../../shared/eventPresentation'

const INITIAL_KINDS = new Set<EventKind>(['commit', 'branch', 'pull_request', 'bug', 'contributor', 'release'])
const DEMO_END = DEMO_EVENTS[DEMO_EVENTS.length - 1]?.at ?? DEMO_REPOSITORY.updatedAt

export function useExplorer() {
  const [input, setInput] = useState('')
  const [repository, setRepository] = useState<RepositorySnapshot | null>(null)
  const [bundle, setBundle] = useState<GitHubBundle | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>(DEMO_EVENTS)
  const [source, setSource] = useState<'demo' | 'github'>('demo')
  const [selectedDate, setSelectedDate] = useState(DEMO_END)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [visibleKinds, setVisibleKinds] = useState<Set<EventKind>>(INITIAL_KINDS)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [showMobileDetails, setShowMobileDetails] = useState(false)
  const requestId = useRef(0)

  const activeRepository = repository ?? DEMO_REPOSITORY
  const [startDate, endDate] = useMemo(
    () => timelineBounds(events, activeRepository.createdAt, activeRepository.pushedAt ?? activeRepository.updatedAt),
    [events, activeRepository],
  )
  const clampedDate = useMemo(() => {
    const current = Date.parse(selectedDate)
    const start = Date.parse(startDate)
    const end = Date.parse(endDate)
    if (!Number.isFinite(current) || current < start) return startDate
    if (current > end) return endDate
    return selectedDate
  }, [selectedDate, startDate, endDate])
  const worldState = useMemo(() => buildWorldState(events, clampedDate), [events, clampedDate])
  const latestEvents = useMemo(
    () => events.filter((event) => visibleKinds.has(event.kind) && Date.parse(event.at) <= Date.parse(clampedDate)).slice().reverse().slice(0, 7),
    [events, visibleKinds, clampedDate],
  )
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null
  const sliderValue = relativePercent(clampedDate, startDate, endDate) * 10
  const hasEarlierHistory = Boolean(bundle && Object.values(bundle.categories).some((category) => category.nextPage && !category.message))
  const hasPartialHistory = Boolean(bundle && (bundle.notes.length || Object.values(bundle.categories).some((category) => category.nextPage || category.message)))
  const hasFailedTrails = Boolean(bundle && Object.values(bundle.categories).some((category) => category.message))

  useEffect(() => {
    if (!isPlaying) return
    const timer = window.setInterval(() => {
      setSelectedDate((currentValue) => {
        const start = Date.parse(startDate)
        const end = Date.parse(endDate)
        const current = Math.max(start, Date.parse(currentValue))
        const next = current + Math.max(60 * 60 * 1000, (end - start) * 0.015)
        if (next >= end) {
          setIsPlaying(false)
          return endDate
        }
        return new Date(next).toISOString()
      })
    }, 240)
    return () => window.clearInterval(timer)
  }, [isPlaying, startDate, endDate])

  useEffect(() => {
    if (selectedEventId && !events.some((event) => event.id === selectedEventId && Date.parse(event.at) <= Date.parse(clampedDate))) {
      setSelectedEventId(null)
    }
  }, [selectedEventId, events, clampedDate])

  async function openRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldError('')
    setLoadError('')
    if (!parseRepositoryInput(input)) {
      setFieldError('Enter a GitHub repository like github.com/owner/repo.')
      return
    }
    requestId.current += 1
    const currentRequest = requestId.current
    setIsLoading(true)
    setIsPlaying(false)
    try {
      const result = await fetchRepository(input)
      if (currentRequest !== requestId.current) return
      const normalized = normalizeBundle(result)
      setBundle(result)
      setRepository(result.repository)
      setEvents(normalized)
      setSource('github')
      setVisibleKinds(new Set(INITIAL_KINDS))
      setSelectedEventId(null)
      setSelectedDate(normalized[normalized.length - 1]?.at ?? result.repository.pushedAt ?? result.repository.createdAt)
      setShowMobileDetails(false)
    } catch (error) {
      if (currentRequest !== requestId.current) return
      if (error instanceof GitHubRequestError && (error.status === 404 || error.status === 400)) {
        setLoadError('Repository not found or private. Check the owner and repository name; only public repositories are available.')
      } else if (error instanceof GitHubRequestError && (error.status === 403 || error.status === 429)) {
        const reset = error.resetAt ? ` Try again after ${formatDate(error.resetAt, { hour: 'numeric', minute: '2-digit' })}.` : ' Try again later.'
        setLoadError(`GitHub's request limit has been reached.${reset}`)
      } else if (error instanceof TypeError) {
        setLoadError('GitHub could not be reached. Check your connection and try again.')
      } else {
        setLoadError(error instanceof Error ? error.message : 'The repository could not be loaded.')
      }
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false)
    }
  }

  function openDemo() {
    requestId.current += 1
    setIsLoading(false)
    setIsLoadingEarlier(false)
    setLoadError('')
    setFieldError('')
    setRepository(DEMO_REPOSITORY)
    setBundle(null)
    setEvents(DEMO_EVENTS)
    setSource('demo')
    setVisibleKinds(new Set(INITIAL_KINDS))
    setSelectedEventId(null)
    setSelectedDate(DEMO_END)
    setIsPlaying(false)
    setShowMobileDetails(false)
  }

  function goHome() {
    requestId.current += 1
    setIsLoading(false)
    setIsLoadingEarlier(false)
    setRepository(null)
    setBundle(null)
    setLoadError('')
    setFieldError('')
    setIsPlaying(false)
    setShowMobileDetails(false)
  }

  async function loadEarlier() {
    if (!bundle || isLoadingEarlier) return
    setIsLoadingEarlier(true)
    const updated = await loadEarlierHistory(bundle)
    setBundle(updated)
    setEvents(normalizeBundle(updated))
    setIsLoadingEarlier(false)
  }

  async function retryRepositoryData() {
    if (!repository || source !== 'github' || isLoading) return
    requestId.current += 1
    const currentRequest = requestId.current
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await fetchRepository(repository.fullName, true)
      if (currentRequest !== requestId.current) return
      const normalized = normalizeBundle(result)
      setBundle(result)
      setRepository(result.repository)
      setEvents(normalized)
      setSelectedEventId(null)
      setSelectedDate(normalized[normalized.length - 1]?.at ?? result.repository.pushedAt ?? result.repository.createdAt)
    } catch (error) {
      if (currentRequest !== requestId.current) return
      setLoadError(error instanceof Error ? error.message : 'The repository could not be refreshed.')
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false)
    }
  }

  function changeDateFromSlider(value: number) {
    const ratio = value / 1000
    const timestamp = Date.parse(startDate) + (Date.parse(endDate) - Date.parse(startDate)) * ratio
    setSelectedDate(new Date(timestamp).toISOString())
  }

  function toggleTimeline() {
    if (isPlaying) {
      setIsPlaying(false)
      return
    }
    if (Date.parse(clampedDate) >= Date.parse(endDate)) setSelectedDate(startDate)
    setIsPlaying(true)
  }

  function toggleKind(kind: EventKind) {
    setVisibleKinds((current) => {
      const next = new Set(current)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  return { input, setInput, repository, bundle, events, source, selectedEventId, setSelectedEventId, visibleKinds, isLoading, isLoadingEarlier, isPlaying, fieldError, loadError, showMobileDetails, setShowMobileDetails, startDate, endDate, clampedDate, worldState, latestEvents, selectedEvent, sliderValue, hasEarlierHistory, hasPartialHistory, hasFailedTrails, openRepository, openDemo, goHome, loadEarlier, retryRepositoryData, changeDateFromSlider, toggleTimeline, toggleKind }
}
