import { useState } from 'react';
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

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const generateQuestions = async (topic: Topic, apiKey: string) => {
    setLoading(true);
    setError(null);

    try {
      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });

      const prompt = `Generate exactly 10 multiple choice questions about "${topic.title}" in the context of Celo blockchain. 
      
      Requirements:
      - Each question should have exactly 4 options
      - Only ONE option should be correct
      - Include practical knowledge, technical concepts, and real-world applications
      - Make questions educational and challenging but fair
      - Focus on: ${topic.description}
      
      Format the response as a valid JSON array with this exact structure:
      [
        {
          "question": "Question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Brief explanation of why this answer is correct"
        }
      ]
      
      Make sure:
      - correctAnswer is the index (0-3) of the correct option
      - Questions are relevant to Celo ecosystem
      - Options are clearly distinct
      - Explanations are educational and helpful`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator on Celo blockchain, cryptocurrency, and DeFi. You create educational quiz questions that help people learn about the Celo ecosystem, mobile payments, stablecoins, and decentralized finance. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      });

      const questionsText = response.choices[0].message.content?.trim() || '';
      
      // Parse the JSON response
      let parsedQuestions: Question[];
      try {
        // Remove any markdown formatting if present
        const cleanedText = questionsText.replace(/```json\n?|\n?```/g, '');
        parsedQuestions = JSON.parse(cleanedText);
      } catch (parseError) {
        // Try to extract JSON from the response
        const jsonMatch = questionsText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedQuestions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse questions from AI response. Please try again.');
        }
      }

      // Validate the questions format
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length !== 10) {
        throw new Error('AI did not generate exactly 10 questions. Please try again.');
      }

      // Validate each question structure
      for (let i = 0; i < parsedQuestions.length; i++) {
        const q = parsedQuestions[i];
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3 || 
            !q.explanation) {
          throw new Error(`Question ${i + 1} has invalid format. Please try again.`);
        }
      }

      setQuestions(parsedQuestions);
      setLoading(false);
      return parsedQuestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const markAnswer = (questionIndex: number, userAnswer: number): AnswerResult | null => {
    if (!questions[questionIndex]) return null;
    
    const question = questions[questionIndex];
    const isCorrect = userAnswer === question.correctAnswer;
    
    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      userAnswer
    };
  };

  const calculateScore = (userAnswers: number[]): ScoreResult => {
    if (!questions.length || !userAnswers.length) return { correct: 0, total: 0, percentage: 0 };
    
    let correct = 0;
    for (let i = 0; i < Math.min(questions.length, userAnswers.length); i++) {
      if (userAnswers[i] === questions[i].correctAnswer) {
        correct++;
      }
    }
    
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100)
    };
  };

  const resetQuiz = () => {
    setQuestions([]);
    setError(null);
  };

  return {
    questions,
    loading,
    error,
    generateQuestions,
    markAnswer,
    calculateScore,
    resetQuiz
  };
};