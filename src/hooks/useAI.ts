import { useState, useCallback, useMemo } from 'react';
import OpenAI from 'openai';

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

// Comprehensive Celo context for better AI responses
const CELO_CONTEXT = `
Celo is a mobile-first blockchain platform focused on financial inclusion and making cryptocurrency accessible to everyone via mobile phones.

KEY CONCEPTS:
- Celo Dollar (cUSD): USD-pegged stablecoin for everyday payments
- Celo Euro (cEUR): EUR-pegged stablecoin
- CELO: Native governance and staking token
- Mobile-first: Phone number-based addresses, lightweight clients
- Proof of Stake: Energy-efficient consensus mechanism
- Carbon Negative: Climate-positive blockchain
- Financial Inclusion: Serving the unbanked globally

TECHNICAL FEATURES:
- EVM-compatible smart contracts (Solidity)
- Gas fees payable in stablecoins (not just CELO)
- Phone number mapping to addresses
- Lightweight sync for mobile devices
- Identity verification system
- Multi-currency support (cUSD, cEUR, CELO)

ECOSYSTEM:
- Valora: Popular Celo mobile wallet
- Ubeswap: DEX on Celo
- Moola Market: Lending protocol
- Symmetric: Automated portfolio management
- Alliance for Prosperity: Impact partners
- Celo Foundation: Ecosystem development

GOVERNANCE:
- CELO holders can vote on proposals
- Validator elections and governance proposals
- Community-driven development
- Focus on regenerative finance (ReFi)

NEVER mention Move programming language - Celo uses Solidity and is EVM-compatible.
`;

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Memoize OpenAI instance creation
  const createOpenAIInstance = useCallback((apiKey: string) => {
    return new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }, []);

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

  // Check if answer distribution is balanced
  const validateAnswerDistribution = useCallback((questions: Question[]): boolean => {
    const answerCounts = [0, 0, 0, 0];
    questions.forEach(q => answerCounts[q.correctAnswer]++);
    
    // Check if any answer appears more than 40% of the time (4 out of 10)
    const maxAllowed = Math.ceil(questions.length * 0.4);
    return answerCounts.every(count => count <= maxAllowed);
  }, []);

  // Shuffle correct answers to ensure distribution
  const redistributeAnswers = useCallback((questions: Question[]): Question[] => {
    // Target distribution: roughly 2-3 answers per option
    const targetDistribution = [2, 3, 2, 3]; // A, B, C, D
    const shuffledQuestions = [...questions];
    
    // Current distribution
    const currentDistribution = [0, 0, 0, 0];
    questions.forEach(q => currentDistribution[q.correctAnswer]++);
    
    // If distribution is already good, return as is
    if (currentDistribution.every((count, i) => Math.abs(count - targetDistribution[i]) <= 1)) {
      return shuffledQuestions;
    }
    
    // Redistribute answers
    let targetIndex = 0;
    shuffledQuestions.forEach((question, qIndex) => {
      // Find next available answer slot
      while (targetDistribution[targetIndex] <= 0) {
        targetIndex = (targetIndex + 1) % 4;
      }
      
      // Only change if current answer is overrepresented
      if (currentDistribution[question.correctAnswer] > targetDistribution[question.correctAnswer]) {
        // Shuffle options and update correct answer
        const correctOption = question.options[question.correctAnswer];
        const shuffledOptions = [...question.options];
        
        // Move correct answer to target position
        shuffledOptions[question.correctAnswer] = shuffledOptions[targetIndex];
        shuffledOptions[targetIndex] = correctOption;
        
        shuffledQuestions[qIndex] = {
          ...question,
          options: shuffledOptions,
          correctAnswer: targetIndex
        };
        
        currentDistribution[question.correctAnswer]--;
        currentDistribution[targetIndex]++;
      }
      
      targetDistribution[targetIndex]--;
      if (targetDistribution[targetIndex] <= 0) {
        targetIndex = (targetIndex + 1) % 4;
      }
    });
    
    return shuffledQuestions;
  }, []);

  // Enhanced prompt with answer distribution requirements
  const buildPrompt = useCallback((topic: Topic) => {
    return `${CELO_CONTEXT}

Generate exactly 10 multiple choice questions about "${topic.title}" specifically within the Celo blockchain ecosystem.

Topic Focus: ${topic.description}

CRITICAL REQUIREMENTS:
- Each question MUST have exactly 4 options (A, B, C, D format)
- DISTRIBUTE CORRECT ANSWERS EVENLY: Aim for 2-3 questions with answer A, 2-3 with answer B, 2-3 with answer C, 2-3 with answer D
- DO NOT make all correct answers the same option (A, B, C, or D)
- Randomize which option is correct for each question
- Questions should cover practical usage, technical concepts, and real-world Celo applications
- Include questions about Celo-specific features (mobile payments, stablecoins, phone number addresses)
- NEVER mention Move programming language (Celo uses Solidity)
- Include Celo dApps, wallets, and ecosystem projects where relevant

ANSWER DISTRIBUTION EXAMPLE:
Question 1: Correct answer = A (index 0)
Question 2: Correct answer = C (index 2)  
Question 3: Correct answer = B (index 1)
Question 4: Correct answer = D (index 3)
Question 5: Correct answer = A (index 0)
... and so on, mixing up the correct answers

DIFFICULTY LEVELS: Mix of beginner (40%), intermediate (40%), and advanced (20%) questions.

Format as valid JSON array with this EXACT structure:
[
  {
    "question": "Clear, specific question about Celo?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Clear explanation focusing on Celo-specific details"
  }
]

Ensure:
- correctAnswer varies between 0, 1, 2, 3 across all questions
- All questions are specifically about Celo (not general crypto)
- Options are clearly distinct and realistic
- Explanations teach Celo ecosystem knowledge
- BALANCED distribution of correct answers across A, B, C, D options`;
  }, []);

  const generateQuestions = useCallback(async (topic: Topic, apiKey: string) => {
    if (!apiKey.trim()) {
      throw new Error('API key is required');
    }

    setLoading(true);
    setError(null);

    try {
      const openai = createOpenAIInstance(apiKey);
      const prompt = buildPrompt(topic);

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a Celo blockchain expert educator. You create educational quiz questions specifically about the Celo ecosystem.
            
            CRITICAL: You MUST vary the correct answers across all questions. DO NOT make all correct answers the same option.
            
            ANSWER DISTRIBUTION REQUIREMENTS:
            - Question 1: Make correct answer A, B, C, or D (randomly choose)
            - Question 2: Make correct answer different from Question 1
            - Question 3: Make correct answer different from Questions 1-2
            - Continue this pattern to ensure roughly equal distribution
            - Target: 2-3 questions each with correct answers A, B, C, D
            
            You have deep knowledge of Celo's mobile-first DeFi, stablecoins, and EVM compatibility.
            Always respond with valid JSON only.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8, // Slightly higher for more randomness in answer selection
        max_tokens: 4000,
        top_p: 0.9,
        frequency_penalty: 0.2, // Higher to encourage variety
        presence_penalty: 0.2
      });

      const questionsText = response.choices[0].message.content?.trim();
      
      if (!questionsText) {
        throw new Error('No response received from AI');
      }

      // Enhanced JSON parsing
      let parsedQuestions: Question[];
      try {
        const cleanedText = questionsText
          .replace(/```json\n?|\n?```|```\n?/g, '')
          .trim();
        
        parsedQuestions = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('Initial parse failed:', parseError);
        
        const jsonMatch = questionsText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            parsedQuestions = JSON.parse(jsonMatch[0]);
          } catch (secondParseError) {
            console.error('Secondary parse failed:', secondParseError);
            throw new Error('Failed to parse AI response. The response format was invalid.');
          }
        } else {
          throw new Error('No valid JSON array found in AI response.');
        }
      }

      // Enhanced validation
      if (!Array.isArray(parsedQuestions)) {
        throw new Error('AI response is not a valid array');
      }

      if (parsedQuestions.length !== 10) {
        console.warn(`AI generated ${parsedQuestions.length} questions, expected 10`);
      }

      // Validate each question
      const invalidQuestions = parsedQuestions
        .map((q, i) => ({ question: q, index: i }))
        .filter(({ question, index }) => !validateQuestion(question, index));

      if (invalidQuestions.length > 0) {
        const invalidIndices = invalidQuestions.map(({ index }) => index + 1).join(', ');
        throw new Error(`Questions ${invalidIndices} have invalid format`);
      }

      // Check and fix answer distribution
      if (!validateAnswerDistribution(parsedQuestions)) {
        console.warn('Poor answer distribution detected, redistributing...');
        parsedQuestions = redistributeAnswers(parsedQuestions);
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
  }, [createOpenAIInstance, buildPrompt, validateQuestion, validateAnswerDistribution, redistributeAnswers]);

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