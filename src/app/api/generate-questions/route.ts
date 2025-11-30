import { NextRequest, NextResponse } from 'next/server';

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

interface Topic {
  title: string;
  description: string;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Store recent questions to prevent repetition (in-memory cache)
const recentQuestionsCache = new Map<string, Set<string>>();
const MAX_CACHE_SIZE = 100; // Keep last 100 question sets

function buildPrompt(topic: Topic, previousQuestions?: string[]): string {
  const varietyInstructions = previousQuestions && previousQuestions.length > 0
    ? `\n\nCRITICAL VARIETY REQUIREMENT:
- You have generated questions about "${topic.title}" before
- DO NOT repeat or rephrase these previous questions:
${previousQuestions.slice(0, 5).map((q, i) => `  ${i + 1}. ${q}`).join('\n')}
- Create COMPLETELY NEW questions with different angles and topics
- Explore different aspects: technical details, use cases, ecosystem projects, governance, economics, security, etc.
- Widen your knowledge library - think beyond basic concepts
- Cover advanced topics, edge cases, and real-world scenarios
- Include questions about recent developments, partnerships, and innovations in the Celo ecosystem`
    : '';

  return `${CELO_CONTEXT}

Generate exactly 10 multiple choice questions about "${topic.title}" specifically within the Celo blockchain ecosystem.

Topic Focus: ${topic.description}
${varietyInstructions}

CRITICAL REQUIREMENTS:
- Each question MUST have exactly 4 options (A, B, C, D format)
- DISTRIBUTE CORRECT ANSWERS EVENLY: Aim for 2-3 questions with answer A, 2-3 with answer B, 2-3 with answer C, 2-3 with answer D
- DO NOT make all correct answers the same option (A, B, C, or D)
- Randomize which option is correct for each question
- Questions should cover practical usage, technical concepts, and real-world Celo applications
- Include questions about Celo-specific features (mobile payments, stablecoins, phone number addresses)
- NEVER mention Move programming language (Celo uses Solidity)
- Include Celo dApps, wallets, and ecosystem projects where relevant
- WIDEN YOUR KNOWLEDGE: Explore diverse topics within this subject - don't just repeat basic concepts
- Cover different difficulty levels and perspectives
- Include questions about:
  * Technical implementation details
  * Real-world use cases and applications
  * Ecosystem projects and partnerships
  * Governance and economics
  * Security and best practices
  * Recent developments and innovations
  * Edge cases and advanced scenarios

ANSWER DISTRIBUTION EXAMPLE:
Question 1: Correct answer = A (index 0)
Question 2: Correct answer = C (index 2)  
Question 3: Correct answer = B (index 1)
Question 4: Correct answer = D (index 3)
Question 5: Correct answer = A (index 0)
... and so on, mixing up the correct answers

DIFFICULTY LEVELS: Mix of beginner (30%), intermediate (40%), and advanced (30%) questions.

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
- BALANCED distribution of correct answers across A, B, C, D options
- Questions are UNIQUE and not repetitive from previous generations`;
}

function validateQuestion(question: Question): boolean {
  if (!question.question || typeof question.question !== 'string') return false;
  if (!Array.isArray(question.options) || question.options.length !== 4) return false;
  if (question.options.some(opt => !opt || typeof opt !== 'string')) return false;
  if (typeof question.correctAnswer !== 'number' || 
      question.correctAnswer < 0 || question.correctAnswer > 3) return false;
  if (!question.explanation || typeof question.explanation !== 'string') return false;
  return true;
}

function validateAnswerDistribution(questions: Question[]): boolean {
  const answerCounts = [0, 0, 0, 0];
  questions.forEach(q => answerCounts[q.correctAnswer]++);
  const maxAllowed = Math.ceil(questions.length * 0.4);
  return answerCounts.every(count => count <= maxAllowed);
}

function redistributeAnswers(questions: Question[]): Question[] {
  const targetDistribution = [2, 3, 2, 3];
  const shuffledQuestions = [...questions];
  const currentDistribution = [0, 0, 0, 0];
  questions.forEach(q => currentDistribution[q.correctAnswer]++);
  
  if (currentDistribution.every((count, i) => Math.abs(count - targetDistribution[i]) <= 1)) {
    return shuffledQuestions;
  }
  
  let targetIndex = 0;
  shuffledQuestions.forEach((question, qIndex) => {
    while (targetDistribution[targetIndex] <= 0) {
      targetIndex = (targetIndex + 1) % 4;
    }
    
    if (currentDistribution[question.correctAnswer] > targetDistribution[question.correctAnswer]) {
      const correctOption = question.options[question.correctAnswer];
      const shuffledOptions = [...question.options];
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic } = body as { topic: Topic };

    if (!topic || !topic.title) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.SEGMIND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Segmind API key not configured' },
        { status: 500 }
      );
    }

    // Get previous questions for this topic to avoid repetition
    const cacheKey = topic.title.toLowerCase();
    const previousQuestions = recentQuestionsCache.get(cacheKey);
    const previousQuestionsArray = previousQuestions 
      ? Array.from(previousQuestions).slice(-10) // Last 10 questions
      : [];

    const prompt = buildPrompt(topic, previousQuestionsArray);
    const systemInstruction = `You are a Celo blockchain expert educator with deep, wide-ranging knowledge. You create diverse, unique educational quiz questions specifically about the Celo ecosystem.

CRITICAL REQUIREMENTS:
1. VARIETY: You MUST create completely unique questions each time. Never repeat or rephrase previous questions.
2. WIDEN YOUR LIBRARY: Explore diverse topics, angles, and difficulty levels within the subject.
3. ANSWER DISTRIBUTION: Vary correct answers across all questions. DO NOT make all correct answers the same option.
4. DEPTH: Cover technical details, use cases, ecosystem projects, governance, economics, security, and innovations.
5. UNIQUENESS: Each question should approach the topic from a different angle or perspective.

ANSWER DISTRIBUTION REQUIREMENTS:
- Question 1: Make correct answer A, B, C, or D (randomly choose)
- Question 2: Make correct answer different from Question 1
- Question 3: Make correct answer different from Questions 1-2
- Continue this pattern to ensure roughly equal distribution
- Target: 2-3 questions each with correct answers A, B, C, D

You have extensive knowledge of Celo's mobile-first DeFi, stablecoins, EVM compatibility, ecosystem projects, governance, and recent developments.
Always respond with valid JSON only.`;

    const response = await fetch('https://api.segmind.com/v1/claude-4-sonnet', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instruction: systemInstruction,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        temperature: 0.9, // Higher temperature for more variety
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.error || `Segmind API error: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // Extract text content from Segmind response
    // Segmind Claude API typically returns: { content: [{ type: 'text', text: '...' }] }
    let questionsText: string | null = null;
    
    if (result.content && Array.isArray(result.content)) {
      // If content is an array, find the text content
      interface ContentItem {
        type: string;
        text?: string;
      }
      const textContent = result.content.find((item: ContentItem) => item.type === 'text');
      questionsText = textContent?.text?.trim() || null;
    } else if (typeof result.content === 'string') {
      questionsText = result.content.trim();
    } else if (typeof result.text === 'string') {
      questionsText = result.text.trim();
    } else if (result.choices && Array.isArray(result.choices) && result.choices.length > 0) {
      // Fallback to OpenAI-like format
      questionsText = result.choices[0].message?.content?.trim() || null;
    } else if (result.message && typeof result.message === 'string') {
      questionsText = result.message.trim();
    } else if (result.response && typeof result.response === 'string') {
      questionsText = result.response.trim();
    }
    
    if (!questionsText) {
      console.error('Segmind API response format:', JSON.stringify(result, null, 2));
      return NextResponse.json(
        { error: 'No response received from AI. Please check the API response format.' },
        { status: 500 }
      );
    }

    // Parse JSON response
    let parsedQuestions: Question[];
    try {
      const cleanedText = questionsText
        .replace(/```json\n?|\n?```|```\n?/g, '')
        .trim();
      
      parsedQuestions = JSON.parse(cleanedText);
    } catch {
      const jsonMatch = questionsText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsedQuestions = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json(
            { error: 'Failed to parse AI response' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'No valid JSON array found in AI response' },
          { status: 500 }
        );
      }
    }

    // Validate response
    if (!Array.isArray(parsedQuestions)) {
      return NextResponse.json(
        { error: 'AI response is not a valid array' },
        { status: 500 }
      );
    }

    if (parsedQuestions.length !== 10) {
      console.warn(`AI generated ${parsedQuestions.length} questions, expected 10`);
    }

    // Validate each question
    const invalidQuestions = parsedQuestions
      .map((q, i) => ({ question: q, index: i }))
      .filter(({ question }) => !validateQuestion(question));

    if (invalidQuestions.length > 0) {
      const invalidIndices = invalidQuestions.map(({ index }) => index + 1).join(', ');
      return NextResponse.json(
        { error: `Questions ${invalidIndices} have invalid format` },
        { status: 500 }
      );
    }

    // Check and fix answer distribution
    if (!validateAnswerDistribution(parsedQuestions)) {
      console.warn('Poor answer distribution detected, redistributing...');
      parsedQuestions = redistributeAnswers(parsedQuestions);
    }

    // Store questions in cache to prevent repetition
    if (!recentQuestionsCache.has(cacheKey)) {
      recentQuestionsCache.set(cacheKey, new Set());
    }
    const questionSet = recentQuestionsCache.get(cacheKey)!;
    parsedQuestions.forEach(q => questionSet.add(q.question));
    
    // Limit cache size
    if (questionSet.size > MAX_CACHE_SIZE) {
      const questionsArray = Array.from(questionSet);
      const toRemove = questionsArray.slice(0, questionSet.size - MAX_CACHE_SIZE);
      toRemove.forEach(q => questionSet.delete(q));
    }

    // Log distribution for debugging
    const distribution = [0, 0, 0, 0];
    parsedQuestions.forEach(q => distribution[q.correctAnswer]++);
    console.log('Answer distribution (A, B, C, D):', distribution);

    return NextResponse.json({ questions: parsedQuestions });
  } catch (error) {
    console.error('Question generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

