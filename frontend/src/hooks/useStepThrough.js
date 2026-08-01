import { useState, useCallback } from 'react'

export function useStepThrough({ totalSteps = 0 } = {}) {
  const [currentStep, setCurrentStep] = useState(0)

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1))
  }, [totalSteps])

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1))
  }, [])

  const goToStep = useCallback((step) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step)
    }
  }, [totalSteps])

  const resetStep = useCallback(() => {
    setCurrentStep(0)
  }, [])

  return {
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    goToStep,
    resetStep,
    isFirst: currentStep === 0,
    isLast: currentStep === Math.max(0, totalSteps - 1)
  }
}
