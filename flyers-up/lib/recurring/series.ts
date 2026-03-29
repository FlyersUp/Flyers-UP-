/** Re-export series lifecycle helpers (approve, counter accept, occurrence insert). */
export {
  approveRecurringSeries,
  assertOccurrencesConflictFree,
  buildEligibilityForNewRequest,
  customerAcceptCounterAndApprove,
  insertOccurrencesForSeries,
  loadSeries,
  mergeCounterProposal,
  seriesUpdatePatchFromMerge,
} from './series-actions';
