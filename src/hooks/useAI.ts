import { useState, useCallback, useMemo } from 'react';

export interface Topic {
  title: string;
  description: string;
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: number;
  explanation: string;
  userAnswer: number;
}

export interface ScoreResult {
  correct: number;
  total: number;
  percentage: number;
}

// CELO_CONTEXT and prompt building are now handled on the server

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Enhanced question validation with answer distribution check
  const validateQuestion = useCallback((question: Question, index: number): boolean => {
    console.log('Validating question:', index);
    if (!question.question || typeof question.question !== 'string') return false;
    if (!Array.isArray(question.options) || question.options.length !== 4) return false;
    if (question.options.some(opt => !opt || typeof opt !== 'string')) return false;
    if (typeof question.correctAnswer !== 'number' || 
        question.correctAnswer < 0 || question.correctAnswer > 3) return false;
    if (!question.explanation || typeof question.explanation !== 'string') return false;
    return true;
  }, []);

  // Note: Answer distribution validation and redistribution are handled on the server
  // These functions were moved to the API route for better performance

  const generateQuestions = useCallback(async (topic: Topic) => {
    // API key is no longer needed - handled on server
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate questions' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const parsedQuestions = data.questions as Question[];

      if (!Array.isArray(parsedQuestions)) {
        throw new Error('Invalid response format from server');
      }

      if (parsedQuestions.length !== 10) {
        console.warn(`Server generated ${parsedQuestions.length} questions, expected 10`);
      }

      // Validate each question
      const invalidQuestions = parsedQuestions
        .map((q, i) => ({ question: q, index: i }))
        .filter(({ question, index }) => !validateQuestion(question, index));

      if (invalidQuestions.length > 0) {
        const invalidIndices = invalidQuestions.map(({ index }) => index + 1).join(', ');
        throw new Error(`Questions ${invalidIndices} have invalid format`);
      }

      // Log distribution for debugging
      const distribution = [0, 0, 0, 0];
      parsedQuestions.forEach(q => distribution[q.correctAnswer]++);
      console.log('Answer distribution (A, B, C, D):', distribution);

      setQuestions(parsedQuestions);
      return parsedQuestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Question generation error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [validateQuestion]);

  // Optimized answer marking with validation
  const markAnswer = useCallback((questionIndex: number, userAnswer: number): AnswerResult | null => {
    if (questionIndex < 0 || questionIndex >= questions.length) return null;
    if (userAnswer < 0 || userAnswer > 3) return null;
    
    const question = questions[questionIndex];
    const isCorrect = userAnswer === question.correctAnswer;
    
    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      userAnswer
    };
  }, [questions]);

  // Optimized score calculation
  const calculateScore = useCallback((userAnswers: number[]): ScoreResult => {
    if (!questions.length || !userAnswers.length) {
      return { correct: 0, total: 0, percentage: 0 };
    }
    
    const total = questions.length;
    const correct = userAnswers.reduce((count, answer, index) => {
      return count + (answer === questions[index]?.correctAnswer ? 1 : 0);
    }, 0);
    
    return {
      correct,
      total,
      percentage: Math.round((correct / total) * 100)
    };
  }, [questions]);

  // Clear state efficiently
  const resetQuiz = useCallback(() => {
    setQuestions([]);
    setError(null);
  }, []);

  // Memoized derived state
  const quizStats = useMemo(() => ({
    totalQuestions: questions.length,
    hasQuestions: questions.length > 0,
    isComplete: questions.length === 10,
    answerDistribution: questions.reduce((acc, q) => {
      acc[q.correctAnswer] = (acc[q.correctAnswer] || 0) + 1;
      return acc;
    }, {} as Record<number, number>)
  }), [questions]);

  return {
    // State
    questions,
    loading,
    error,
    quizStats,
    
    // Actions
    generateQuestions,
    markAnswer,
    calculateScore,
    resetQuiz
  };
};