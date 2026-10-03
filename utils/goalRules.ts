export interface GoalPauseValidationParams {
  currentPauseCount: number;
  reasonType: 'standard' | 'tragedy';
  tragedyExplanation?: string;
}

export interface ValidationResult {
  allowed: boolean;
  message: string;
}

export function validatePauseEligibility({
  currentPauseCount,
  reasonType,
  tragedyExplanation,
}: GoalPauseValidationParams): ValidationResult {
  if (currentPauseCount >= 2) {
    return {
      allowed: false,
      message: 'Limit reached: Goals can only be paused up to 2 times in their lifetime.',
    };
  }

  if (reasonType === 'tragedy' && (!tragedyExplanation || tragedyExplanation.trim().length < 10)) {
    return {
      allowed: false,
      message: 'Please provide a valid reason (at least 10 characters) for a tragedy pause.',
    };
  }

  return { allowed: true, message: '' };
}

export interface GoalPauseStatus {
  isPaused: boolean;
  isInGracePeriod: boolean;
  isExpiredAndPendingRemoval: boolean;
  daysRemainingInGrace: number;
}

export function evaluatePauseGracePeriod(
  status: string,
  pausedAt: string | null,
  pauseDurationDays: number = 5,
  gracePeriodDays: number = 3
): GoalPauseStatus {
  if (status !== 'paused' || !pausedAt) {
    return {
      isPaused: false,
      isInGracePeriod: false,
      isExpiredAndPendingRemoval: false,
      daysRemainingInGrace: 0,
    };
  }

  const pauseStartDate = new Date(pausedAt);
  const now = new Date();

  const pauseEndDate = new Date(pauseStartDate);
  pauseEndDate.setDate(pauseEndDate.getDate() + pauseDurationDays);

  const graceEndDate = new Date(pauseEndDate);
  graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);

  if (now < pauseEndDate) {
    return {
      isPaused: true,
      isInGracePeriod: false,
      isExpiredAndPendingRemoval: false,
      daysRemainingInGrace: gracePeriodDays,
    };
  } else if (now >= pauseEndDate && now < graceEndDate) {
    const diffTime = graceEndDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isPaused: false,
      isInGracePeriod: true,
      isExpiredAndPendingRemoval: false,
      daysRemainingInGrace: daysRemaining,
    };
  } else {
    return {
      isPaused: false,
      isInGracePeriod: false,
      isExpiredAndPendingRemoval: true,
      daysRemainingInGrace: 0,
    };
  }
}