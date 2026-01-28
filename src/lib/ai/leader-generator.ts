import "server-only";

type AnyRecord = Record<string, unknown>;

function isPlainObject(v: unknown): v is AnyRecord {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function toIsoDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * List of famous people patterns to detect.
 * These are checked against both name and description fields.
 * For historical figures, celebrities, politicians, etc.
 */
const FAMOUS_PEOPLE_PATTERNS = [
  // Historical political figures
  /\b(hitler|adolf hitler|mussolini|stalin|lenin|mao|churchill|gandhi|mandela|lincoln|washington|napoleon|caesar|cleopatra|alexander the great)\b/i,
  // Modern politicians
  /\b(trump|obama|biden|putin|xi jinping|modi|merkel|macron|trudeau)\b/i,
  // Tech leaders
  /\b(elon musk|jeff bezos|bill gates|steve jobs|mark zuckerberg|larry page|sergey brin|tim cook|satya nadella|jensen huang)\b/i,
  // Entertainers
  /\b(michael jackson|elvis|madonna|beyonce|taylor swift|kanye|drake|eminem|oprah|kim kardashian|lady gaga)\b/i,
  // Athletes
  /\b(michael jordan|lebron|kobe|messi|ronaldo|serena williams|tiger woods|muhammad ali|mike tyson)\b/i,
  // Scientists/Inventors
  /\b(einstein|newton|darwin|hawking|tesla|edison|marie curie|galileo|copernicus)\b/i,
  // Historical figures
  /\b(jesus|buddha|muhammad|confucius|socrates|plato|aristotle|shakespeare|da vinci|michelangelo|picasso)\b/i,
  // Fictional characters
  /\b(sherlock holmes|harry potter|darth vader|batman|superman|spider-?man|iron man|james bond|indiana jones)\b/i,
  // Business/Finance
  /\b(warren buffett|ray dalio|george soros|jamie dimon|carl icahn|peter thiel|sam altman)\b/i,
];

/**
 * Detects if text contains a famous person's name
 * Returns the matched name if found, null otherwise
 */
function detectFamousPersonInText(text: string): string | null {
  if (!text) return null;
  
  for (const pattern of FAMOUS_PEOPLE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0]; // Return the matched name
    }
  }
  return null;
}

/**
 * Extracts a potential famous person name from name or description
 */
function extractFamousPersonName(name: string, description: string): { detectedName: string | null; isFamous: boolean } {
  // First check the name field
  const nameMatch = detectFamousPersonInText(name);
  if (nameMatch) {
    return { detectedName: name.trim() || nameMatch, isFamous: true };
  }
  
  // Then check the description
  const descMatch = detectFamousPersonInText(description);
  if (descMatch) {
    return { detectedName: descMatch, isFamous: true };
  }
  
  return { detectedName: null, isFamous: false };
}

export type GenerateLeaderBibleInput = {
  name?: string;
  description?: string;
  onProgress?: (data: { tokens: number; estimatedTotal: number; percentage: number }) => void;
};

export type GenerateLeaderBibleResult = {
  leader: unknown;
  model: string;
};

/**
 * Random leader archetypes that align with our values:
 * - Value-first approach
 * - Honest, transparent, AI-powered
 * - Diverse domains and personalities
 * - Non-exploitative, trust-building
 */
const RANDOM_LEADER_ARCHETYPES = [
  // Finance/Investing (12)
  { name: "", description: "A calm, analytical personal finance guide who helps beginners build wealth through simple index fund investing and budgeting. Anti-hype, pro-patience. Speaks in clear analogies." },
  { name: "", description: "A no-nonsense small business financial advisor who helps entrepreneurs understand cash flow, pricing, and sustainable growth. Direct but supportive tone." },
  { name: "", description: "A crypto-skeptic blockchain educator who explains the technology honestly—both opportunities and risks—without shilling or FUD." },
  { name: "", description: "A debt-free journey coach who helps people develop realistic plans to eliminate debt without shame or judgment. Empowering, practical." },
  { name: "", description: "A tax optimization strategist for freelancers and contractors explaining deductions and quarterly payments. Detail-oriented but approachable." },
  { name: "", description: "A real estate investing educator focused on rental properties and house hacking for beginners. Skeptical of 'get rich quick' schemes." },
  { name: "", description: "A retirement planning guide helping people in their 30s-40s understand 401(k)s, IRAs, and compound interest. Patient, numbers-driven." },
  { name: "", description: "A side hustle economics expert teaching sustainable ways to earn extra income without burnout. Realistic about time investment." },
  { name: "", description: "A frugality coach who celebrates creative money-saving without deprivation. Finds joy in resourcefulness, not restriction." },
  { name: "", description: "A college financial aid navigator helping families understand FAFSA, scholarships, and student loan options. Demystifies complexity." },
  { name: "", description: "An estate planning educator making wills, trusts, and inheritance accessible to regular families. Gentle about mortality, practical." },
  { name: "", description: "A salary negotiation coach helping professionals advocate for fair compensation. Data-driven, confidence-building, anti-imposter syndrome." },

  // Health/Fitness (15)
  { name: "", description: "A science-based fitness coach who cuts through gym bro-science with evidence-backed training advice. Warm, encouraging, cites studies." },
  { name: "", description: "A practical nutrition guide focused on sustainable eating habits, not fad diets. Anti-restriction, pro-balance. Speaks like a supportive friend." },
  { name: "", description: "A sleep optimization specialist who helps busy professionals fix their sleep without expensive gadgets. Calm, methodical, solution-focused." },
  { name: "", description: "A running coach for absolute beginners helping people go from couch to 5K. Celebrates slow progress, injury prevention focus." },
  { name: "", description: "A yoga instructor demystifying the practice for skeptics and athletes. Emphasizes physical benefits over spiritual aspects." },
  { name: "", description: "A posture and mobility expert helping desk workers undo computer hunch. Simple daily exercises, ergonomics advice." },
  { name: "", description: "A strength training guide for women over 40 focused on bone density and longevity. Empowering, evidence-based." },
  { name: "", description: "A hydration and electrolyte educator explaining water intake, sodium, and athletic performance. Scientific but accessible." },
  { name: "", description: "A meal prep strategist for busy families making batch cooking and freezer meals less overwhelming. Time-efficient, flexible." },
  { name: "", description: "A gut health guide explaining probiotics, fiber, and digestive wellness without pseudoscience. Research-backed, no miracle cures." },
  { name: "", description: "A chronic pain management coach teaching evidence-based coping strategies. Compassionate, validates struggles, offers hope." },
  { name: "", description: "A women's health educator covering hormones, menstrual cycles, and perimenopause. Frank, destigmatizing, medically accurate." },
  { name: "", description: "A men's health advocate discussing prostate health, testosterone, and mental wellness. Breaks masculine silence, encourages check-ups." },
  { name: "", description: "A supplement skeptic explaining what actually works (vitamin D, omega-3) vs. marketing hype. Saves people money." },
  { name: "", description: "A body neutrality coach helping people develop healthier relationships with their bodies. Anti-diet culture, pro-function over appearance." },

  // Business/Entrepreneurship (12)
  { name: "", description: "A bootstrapping mentor for first-time founders who want to build profitable businesses without VC funding. Pragmatic, frugal, anti-hustle-culture." },
  { name: "", description: "A remote work productivity expert helping distributed teams communicate and collaborate effectively. Systems-focused, empathetic to async challenges." },
  { name: "", description: "A career transition coach specializing in helping people pivot industries after 30. Encouraging but realistic about the journey." },
  { name: "", description: "A freelance business coach teaching sustainable client acquisition and pricing. Honest about feast-famine cycles, boundary-setting." },
  { name: "", description: "A LinkedIn strategy guide for professionals who hate self-promotion. Authentic engagement over performative posting." },
  { name: "", description: "A solopreneur operations expert helping one-person businesses systemize and automate. Efficiency without losing personal touch." },
  { name: "", description: "A nonprofit fundraising strategist teaching grant writing and donor cultivation. Mission-driven, sustainable revenue focus." },
  { name: "", description: "A workplace communication specialist helping employees navigate difficult coworkers and managers. Diplomatic but assertive." },
  { name: "", description: "A leadership development coach for new managers overwhelmed by people management. Humanizes leadership, teaches feedback skills." },
  { name: "", description: "A networking coach for introverts making professional connections feel less transactional. Quality over quantity." },
  { name: "", description: "A business email writing guide teaching clear, professional communication. Cuts corporate jargon, values clarity." },
  { name: "", description: "A pricing psychology educator helping service providers charge what they're worth. Tackles undervaluing and money mindset." },

  // Technology (10)
  { name: "", description: "A beginner-friendly coding mentor who teaches programming through building real projects. Patient, celebrates small wins, demystifies tech jargon." },
  { name: "", description: "A cybersecurity educator who helps regular people protect themselves online without paranoia. Practical, not fear-mongering." },
  { name: "", description: "An AI literacy guide who explains machine learning concepts to non-technical audiences. Honest about both capabilities and limitations." },
  { name: "", description: "A digital privacy advocate teaching VPNs, password managers, and data protection. Balances security with usability." },
  { name: "", description: "A web accessibility educator making inclusive design understandable for developers and designers. Empathy-driven, standards-focused." },
  { name: "", description: "A spreadsheet wizard teaching Excel/Google Sheets formulas and automation for non-technical workers. Unlocks productivity." },
  { name: "", description: "A tech career advisor helping bootcamp grads and self-taught developers land their first jobs. Portfolio over pedigree." },
  { name: "", description: "A smartphone setup guide helping seniors and tech novices use their devices confidently. Patient, jargon-free." },
  { name: "", description: "A data literacy educator teaching everyday people to read charts, spot manipulation, and question statistics. Critical thinking focus." },
  { name: "", description: "A video conferencing coach helping remote workers look professional on Zoom. Lighting, framing, audio, engagement tips." },

  // Mental Health/Wellbeing (12)
  { name: "", description: "A stress management coach using evidence-based techniques like CBT and mindfulness. Warm, non-judgmental, respects therapy boundaries." },
  { name: "", description: "A burnout recovery specialist for high-achievers who need to rebuild sustainable work habits. Direct but compassionate." },
  { name: "", description: "An anxiety educator who shares coping strategies and destigmatizes mental health struggles. Relatable, research-informed." },
  { name: "", description: "A grief support guide helping people navigate loss with practical coping mechanisms. Gentle, validating, no toxic positivity." },
  { name: "", description: "A ADHD productivity strategist teaching systems that work with ADHD brains, not against them. Neurodivergent-friendly." },
  { name: "", description: "A perfectionism recovery coach helping people embrace 'good enough' and reduce self-imposed pressure. Liberating, compassionate." },
  { name: "", description: "A loneliness and social isolation educator teaching connection-building skills for adults. Normalizes struggle, actionable steps." },
  { name: "", description: "A therapy preparation guide helping people get the most from counseling sessions. Homework ideas, question prompts." },
  { name: "", description: "A morning routine optimizer helping night owls find rhythms that work for them. No 5am wake-up cult." },
  { name: "", description: "A seasonal affective disorder coach teaching light therapy, vitamin D, and winter coping strategies. Science-based, validating." },
  { name: "", description: "A digital detox strategist helping people develop healthier relationships with technology. Balanced, not all-or-nothing." },
  { name: "", description: "A self-compassion teacher helping people talk to themselves with kindness. Evidence-based, not fluffy." },

  // Education/Learning (9)
  { name: "", description: "A learning strategy expert who teaches people how to learn effectively—spaced repetition, active recall, note-taking systems. Enthusiastic and nerdy." },
  { name: "", description: "A public speaking coach who helps introverts and anxious speakers find their voice. Supportive, technique-focused." },
  { name: "", description: "A critical thinking guide who teaches media literacy and how to evaluate information online. Socratic, non-partisan." },
  { name: "", description: "A memory improvement trainer teaching mnemonic techniques and memory palaces. Practical applications for students and professionals." },
  { name: "", description: "A reading comprehension coach helping adults improve speed and retention. No shame about reading level." },
  { name: "", description: "A test-taking strategist for standardized exams (SAT, GRE, professional licenses). Stress management and technique." },
  { name: "", description: "A foreign language learning guide teaching immersion techniques and consistent practice habits. Anti-Duolingo streak anxiety." },
  { name: "", description: "A homeschool curriculum advisor helping parents navigate educational choices. Flexible approaches, diverse learning styles." },
  { name: "", description: "A lifelong learning evangelist encouraging curiosity and skill-building after formal education ends. Growth mindset, low pressure." },

  // Relationships/Communication (10)
  { name: "", description: "A communication skills coach for professional settings—difficult conversations, negotiation, feedback. Direct, actionable frameworks." },
  { name: "", description: "A relationship educator focused on healthy communication patterns for couples. Research-based, non-preachy, inclusive." },
  { name: "", description: "A boundaries and assertiveness coach helping people-pleasers advocate for themselves. Empathetic but firm." },
  { name: "", description: "A conflict resolution mediator teaching de-escalation and finding common ground. Neutral, practical dialogue skills." },
  { name: "", description: "A friendship maintenance guide for busy adults struggling to stay connected. Realistic expectations, quality time ideas." },
  { name: "", description: "A dating communication strategist helping people express needs and read green/red flags. Honest, safety-conscious." },
  { name: "", description: "A family boundary-setting coach for adult children navigating complicated parent relationships. Validating, guilt-reduction." },
  { name: "", description: "An active listening trainer teaching presence and empathy in conversations. Reduces fixing/advising reflex." },
  { name: "", description: "A difficult people navigator helping folks deal with toxic coworkers, relatives, and neighbors. Survival strategies, gray rock method." },
  { name: "", description: "A small talk survival guide for people who dread networking events and elevator conversations. Templates and escape routes." },

  // Lifestyle/Personal Development (12)
  { name: "", description: "A minimalism guide focused on intentional living—decluttering, simplifying decisions, finding what matters. Calm, philosophical, not preachy." },
  { name: "", description: "A time management specialist for overwhelmed professionals—systems, priorities, saying no. Structured but flexible." },
  { name: "", description: "A creative hobby encourager who helps busy adults rediscover play and artistic expression. Playful, low-pressure, process-focused." },
  { name: "", description: "A habit formation coach teaching atomic habits and behavior change. Evidence-based, celebrates tiny wins." },
  { name: "", description: "A morning pages and journaling guide for people who hate journaling. Removes pressure, multiple formats." },
  { name: "", description: "A decision fatigue reducer teaching simplified wardrobe, meal planning, and routine automation. Mental energy conservation." },
  { name: "", description: "A gratitude practice skeptic who finds evidence-based benefits without toxic positivity. Practical appreciation exercises." },
  { name: "", description: "A procrastination understanding coach examining root causes (fear, perfectionism, unclear goals). Compassionate problem-solving." },
  { name: "", description: "A goal-setting realist teaching SMART goals and anti-resolution culture. Sustainable progress over January burnout." },
  { name: "", description: "A rest and recovery advocate helping workaholics learn to do nothing productively. Permission to pause." },
  { name: "", description: "A identity exploration guide for people feeling stuck or lost in life transitions. Reflective questions, value clarification." },
  { name: "", description: "A multi-generational household mediator helping families navigate living together. Cultural sensitivity, boundary negotiation." },

  // Niche/Unique (8)
  { name: "", description: "A personal historian who helps people document family stories and create meaningful legacy projects. Warm, nostalgic, detail-oriented." },
  { name: "", description: "A home cook mentor focused on building confidence in the kitchen through simple, flexible recipes. Encouraging, practical, celebrates imperfection." },
  { name: "", description: "A neighborhood community builder who shares strategies for fostering local connections and civic engagement. Optimistic, practical, inclusive." },
  { name: "", description: "A capsule wardrobe consultant helping people build versatile, sustainable closets. Style clarity, reduced decision fatigue." },
  { name: "", description: "A pet behavior specialist teaching positive reinforcement training for dogs and cats. Patient, science-based, no dominance myths." },
  { name: "", description: "A houseplant care guide for serial plant killers. Forgiving, troubleshooting focus, celebrates alive plants." },
  { name: "", description: "A letter-writing revivalist teaching the art of handwritten correspondence and meaningful communication. Nostalgic, intentional connection." },
  { name: "", description: "A sustainable living pragmatist teaching imperfect environmentalism—small changes that actually stick. No eco-shaming." },
];

/**
 * Get a random leader archetype for generation when no input provided
 */
function getRandomLeaderArchetype(): { name: string; description: string } {
  const idx = Math.floor(Math.random() * RANDOM_LEADER_ARCHETYPES.length);
  return RANDOM_LEADER_ARCHETYPES[idx];
}

/**
 * Leader Bible v1.0 Schema
 * Complete input specification for AI Leader generation
 * Based on the Leader Bible Schema specification
 */
export const LEADER_BIBLE_V1_SCHEMA: AnyRecord = {
  type: "object",
  additionalProperties: false,
  properties: {
    $schema: { type: "string" },

    metadata: {
      type: "object",
      additionalProperties: false,
      description: "System tracking and classification data",
      properties: {
        leaderId: { type: "string", description: "Unique identifier for this Leader (e.g. MAYA-SATO-BTC-001)" },
        bibleVersion: { type: "string", description: "Version of this Leader Bible" },
        createdDate: { type: "string", description: "Date this Bible was created (ISO date)" },
        lastModified: { type: "string", description: "Timestamp of last modification (ISO datetime)" },
        vertical: {
          type: "string",
          enum: ["Finance", "Health", "Business", "Technology", "Education", "Lifestyle", "Legal", "MentalHealth", "Relationships", "Other"],
          description: "Primary domain/vertical for this Leader"
        },
        subDomains: {
          type: "array",
          items: { type: "string" },
          description: "Specific sub-areas within the vertical"
        },
        status: {
          type: "string",
          enum: ["Draft", "Review", "Approved", "Active", "Retired"],
          description: "Current status of this Leader Bible"
        },
        approvedBy: { type: "string", description: "Name of person who approved this Bible" },
        leadershipScores: {
          type: "object",
          additionalProperties: false,
          description: "Target scores from Leadership Definition framework",
          properties: {
            character: { type: "integer", description: "Character pillar score (0-100)" },
            competence: { type: "integer", description: "Competence pillar score (0-100)" },
            impact: { type: "integer", description: "Impact pillar score (0-100)" },
            jobsRuleMultiplier: { type: "number", description: "Jobs Rule modifier (0-1)" },
            compositeScore: { type: "integer", description: "Final weighted composite score (0-100)" },
            tier: { type: "string", enum: ["Competent", "Strong", "Exceptional", "Legendary"], description: "Leadership tier" },
            scoringReasoning: {
              type: "object",
              additionalProperties: false,
              description: "Detailed breakdown and reasoning for each score",
              properties: {
                character: { type: "string", description: "Why this Character score? (2-3 sentences citing specific examples of integrity, beneficence, vulnerability, accountability, consistency)" },
                competence: { type: "string", description: "Why this Competence score? (2-3 sentences citing specific examples of vision, expertise, communication, courage)" },
                impact: { type: "string", description: "Why this Impact score? (2-3 sentences citing specific examples of value creation, trustworthiness, results)" },
                jobsRule: { type: "string", description: "Why this Jobs Rule multiplier? (2-3 sentences explaining ethical considerations, any flaws or controversies that affected the multiplier)" }
              },
              required: ["character", "competence", "impact", "jobsRule"]
            }
          },
          required: ["character", "competence", "impact", "jobsRuleMultiplier", "compositeScore", "tier", "scoringReasoning"]
        }
      },
      required: ["leaderId", "bibleVersion", "createdDate", "lastModified", "vertical", "subDomains", "status", "approvedBy", "leadershipScores"]
    },

    coreIdentity: {
      type: "object",
      additionalProperties: false,
      description: "Fundamental identity of the Leader",
      properties: {
        name: { type: "string", description: "Full name of the AI Leader" },
        basedOnFamousPerson: { type: "boolean", description: "Set to true if this leader is based on a famous/well-known person (celebrity, historical figure, fictional character). If true, image generation will use their name directly instead of describing visual attributes." },
        tagline: { type: "string", description: "One-line descriptor" },
        missionStatement: { type: "string", description: "2-3 sentences describing purpose, audience served, and outcome" },
        primaryAudience: {
          type: "object",
          additionalProperties: false,
          properties: {
            description: { type: "string", description: "Narrative description of the audience" },
            demographics: {
              type: "object",
              additionalProperties: false,
              properties: {
                ageRange: { type: "string" },
                geography: { type: "string" },
                other: { type: "string" }
              },
              required: ["ageRange", "geography", "other"]
            },
            psychographics: { type: "array", items: { type: "string" }, description: "Values, interests, attitudes" },
            painPoints: { type: "array", items: { type: "string" }, description: "Problems and frustrations" },
            aspirations: { type: "array", items: { type: "string" }, description: "Goals and desires" },
            knowledgeLevel: { type: "string", enum: ["Beginner", "Intermediate", "Advanced", "Mixed"], description: "Primary knowledge level" }
          },
          required: ["description", "demographics", "psychographics", "painPoints", "aspirations", "knowledgeLevel"]
        },
        positioning: { type: "string", description: "How this Leader is different from competitors" },
        leadershipTierTarget: { type: "string", enum: ["Competent", "Strong", "Exceptional", "Legendary"] }
      },
      required: ["name", "basedOnFamousPerson", "tagline", "missionStatement", "primaryAudience", "positioning", "leadershipTierTarget"]
    },

    visualIdentity: {
      type: "object",
      additionalProperties: false,
      description: "Physical appearance and image generation specifications",
      properties: {
        physicalDescription: {
          type: "object",
          additionalProperties: false,
          properties: {
            apparentAge: { type: "string", description: "Age range the Leader appears to be" },
            genderPresentation: { type: "string", enum: ["Male", "Female", "Non-binary", "Other"] },
            ethnicity: { type: "string", description: "Ethnic appearance for visual consistency" },
            buildBodyType: { type: "string" },
            hair: {
              type: "object",
              additionalProperties: false,
              properties: {
                color: { type: "string" },
                style: { type: "string" },
                length: { type: "string" }
              },
              required: ["color", "style", "length"]
            },
            eyes: {
              type: "object",
              additionalProperties: false,
              properties: {
                color: { type: "string" },
                notableFeatures: { type: "string" }
              },
              required: ["color", "notableFeatures"]
            },
            facialFeatures: { type: "string", description: "Distinctive facial characteristics" },
            typicalAttire: { type: "string", description: "Standard clothing style" },
            distinguishingFeatures: { type: "array", items: { type: "string" }, description: "Unique identifiable features" }
          },
          required: ["apparentAge", "genderPresentation", "ethnicity", "buildBodyType", "hair", "eyes", "facialFeatures", "typicalAttire", "distinguishingFeatures"]
        },
        visualStyle: {
          type: "object",
          additionalProperties: false,
          properties: {
            photographyStyle: { type: "string" },
            colorPalette: {
              type: "object",
              additionalProperties: false,
              properties: {
                primary: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: { name: { type: "string" }, hex: { type: "string" } },
                    required: ["name", "hex"]
                  }
                },
                accent: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: { name: { type: "string" }, hex: { type: "string" } },
                    required: ["name", "hex"]
                  }
                }
              },
              required: ["primary", "accent"]
            },
            backgroundStyle: { type: "string" },
            moodEnergy: { type: "string" }
          },
          required: ["photographyStyle", "colorPalette", "backgroundStyle", "moodEnergy"]
        },
        imagePrompts: {
          type: "object",
          additionalProperties: false,
          properties: {
            primary: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                prompt: { type: "string", description: "Full image generation prompt" },
                parameters: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    aspectRatio: { type: "string" },
                    style: { type: "string" }
                  },
                  required: ["aspectRatio", "style"]
                }
              },
              required: ["name", "description", "prompt", "parameters"]
            },
            variations: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  prompt: { type: "string" },
                  useCase: { type: "string" },
                  parameters: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      aspectRatio: { type: "string" },
                      style: { type: "string" }
                    },
                    required: ["aspectRatio", "style"]
                  }
                },
                required: ["name", "description", "prompt", "useCase", "parameters"]
              }
            }
          },
          required: ["primary", "variations"]
        }
      },
      required: ["physicalDescription", "visualStyle", "imagePrompts"]
    },

    voiceIdentity: {
      type: "object",
      additionalProperties: false,
      description: "Audio/voice characteristics for generation",
      properties: {
        voiceCharacteristics: {
          type: "object",
          additionalProperties: false,
          properties: {
            voiceType: { type: "string", description: "Overall voice classification" },
            pitchRange: { type: "string", enum: ["Low", "Medium-Low", "Medium", "Medium-High", "High"] },
            speakingPace: { type: "string", enum: ["Slow", "Measured", "Conversational", "Energetic", "Rapid"] },
            accentDialect: { type: "string" },
            vocalTexture: { type: "string", enum: ["Smooth", "Warm", "Crisp", "Gravelly", "Bright"] },
            emotionalRange: { type: "string", enum: ["Reserved", "Moderate", "Expressive", "Highly Expressive"] }
          },
          required: ["voiceType", "pitchRange", "speakingPace", "accentDialect", "vocalTexture", "emotionalRange"]
        },
        speechPatterns: {
          type: "object",
          additionalProperties: false,
          properties: {
            verbalHabits: { type: "string", description: "Recurring speech patterns, filler words used or avoided" },
            emphasisStyle: { type: "string", description: "How key points are emphasized" }
          },
          required: ["verbalHabits", "emphasisStyle"]
        },
        voiceDescription: { type: "string", description: "Complete voice description for synthesis" }
      },
      required: ["voiceCharacteristics", "speechPatterns", "voiceDescription"]
    },

    videoIdentity: {
      type: "object",
      additionalProperties: false,
      description: "Video generation specifications",
      properties: {
        movementPresence: {
          type: "object",
          additionalProperties: false,
          properties: {
            physicalEnergy: { type: "string", enum: ["Still", "Subtle", "Moderate", "Dynamic"] },
            gestureStyle: { type: "string", enum: ["Minimal", "Occasional", "Expressive", "Highly Animated"] },
            eyeContact: { type: "string" },
            headMovement: { type: "string", enum: ["Still", "Subtle", "Natural", "Expressive"] },
            facialExpressiveness: { type: "string", enum: ["Reserved", "Moderate", "Expressive", "Highly Animated"] }
          },
          required: ["physicalEnergy", "gestureStyle", "eyeContact", "headMovement", "facialExpressiveness"]
        },
        videoStyle: {
          type: "object",
          additionalProperties: false,
          properties: {
            framing: { type: "string", enum: ["Tight Headshot", "Head and Shoulders", "Waist Up", "Full Body"] },
            cameraMovement: { type: "string", enum: ["Static", "Subtle Zoom", "Gentle Movement", "Dynamic"] },
            lightingStyle: { type: "string", enum: ["Studio", "Natural", "Dramatic", "Soft"] },
            background: { type: "string" }
          },
          required: ["framing", "cameraMovement", "lightingStyle", "background"]
        },
        videoPrompts: {
          type: "object",
          additionalProperties: false,
          properties: {
            standard: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                prompt: { type: "string", description: "Full video generation prompt template" }
              },
              required: ["name", "description", "prompt"]
            },
            shortForm: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                prompt: { type: "string" },
                aspectRatio: { type: "string" }
              },
              required: ["name", "description", "prompt", "aspectRatio"]
            },
            variations: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  prompt: { type: "string" },
                  useCase: { type: "string" }
                },
                required: ["name", "description", "prompt", "useCase"]
              }
            }
          },
          required: ["standard", "shortForm", "variations"]
        }
      },
      required: ["movementPresence", "videoStyle", "videoPrompts"]
    },

    personalityMatrix: {
      type: "object",
      additionalProperties: false,
      description: "8-dimension personality calibration (1-10 scales)",
      properties: {
        dimensions: {
          type: "object",
          additionalProperties: false,
          properties: {
            energy: {
              type: "object",
              additionalProperties: false,
              properties: {
                value: { type: "integer" },
                lowLabel: { type: "string" },
                highLabel: { type: "string" },
                description: { type: "string" }
              },
              required: ["value", "lowLabel", "highLabel", "description"]
            },
            formality: {
              type: "object",
              additionalProperties: false,
              properties: {
                value: { type: "integer" },
                lowLabel: { type: "string" },
                highLabel: { type: "string" },
                description: { type: "string" }
              },
              required: ["value", "lowLabel", "highLabel", "description"]
            },
            humor: {
              type: "object",
              additionalProperties: false,
              properties: {
                value: { type: "integer" },
                lowLabel: { type: "string" },
                highLabel: { type: "string" },
                description: { type: "string" }
              },
              required: ["value", "lowLabel", "highLabel", "description"]
            },
            authority: {
              type: "object",
              additionalProperties: false,
              properties: {
                value: { type: "integer" },
                lowLabel: { type: "string" },
                highLabel: { type: "string" },
                description: { type: "string" }
              },
              required: ["value", "lowLabel", "highLabel", "description"]
            },
            warmth: {
              type: "object",
              additionalProperties: false,
              properties: {
                value: { type: "integer" },
                lowLabel: { type: "string" },
                highLabel: { type: "string" },
                description: { type: "string" }
              },
              required: ["value", "lowLabel", "highLabel", "description"]
            },
            expressiveness: {
              type: "object",
              additionalProperties: false,
              properties: {
                value: { type: "integer" },
                lowLabel: { type: "string" },
                highLabel: { type: "string" },
                description: { type: "string" }
              },
              required: ["value", "lowLabel", "highLabel", "description"]
            },
            confidence: {
              type: "object",
              additionalProperties: false,
              properties: {
                value: { type: "integer" },
                lowLabel: { type: "string" },
                highLabel: { type: "string" },
                description: { type: "string" }
              },
              required: ["value", "lowLabel", "highLabel", "description"]
            },
            pace: {
              type: "object",
              additionalProperties: false,
              properties: {
                value: { type: "integer" },
                lowLabel: { type: "string" },
                highLabel: { type: "string" },
                description: { type: "string" }
              },
              required: ["value", "lowLabel", "highLabel", "description"]
            }
          },
          required: ["energy", "formality", "humor", "authority", "warmth", "expressiveness", "confidence", "pace"]
        },
        summary: { type: "string", description: "2-3 sentence narrative summary of the personality" }
      },
      required: ["dimensions", "summary"]
    },

    expertiseDomain: {
      type: "object",
      additionalProperties: false,
      description: "Knowledge and expertise specifications",
      properties: {
        coreDomain: { type: "string", description: "Primary topic area of expertise" },
        subSpecializations: { type: "array", items: { type: "string" }, description: "Specific niches within the core domain" },
        adjacentTopics: { type: "array", items: { type: "string" }, description: "Related areas with moderate authority" },
        knowledgeDepth: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              topic: { type: "string" },
              depthLevel: { type: "string", enum: ["Expert", "Advanced", "Intermediate", "Basic"] },
              canProvide: { type: "string", description: "What level of guidance can be given" }
            },
            required: ["topic", "depthLevel", "canProvide"]
          }
        },
        expertiseStatement: { type: "string", description: "Honest framing of how the Leader describes their knowledge" }
      },
      required: ["coreDomain", "subSpecializations", "adjacentTopics", "knowledgeDepth", "expertiseStatement"]
    },

    communicationStyle: {
      type: "object",
      additionalProperties: false,
      description: "Writing and speaking style specifications",
      properties: {
        writingVoice: {
          type: "object",
          additionalProperties: false,
          properties: {
            vocabularyLevel: { type: "string", enum: ["Simple", "Accessible", "Professional", "Technical", "Academic"] },
            sentenceStructure: { type: "string", enum: ["Short", "Varied", "Complex", "Long-form"] },
            tone: { type: "string" },
            stylisticQuirks: { type: "array", items: { type: "string" } }
          },
          required: ["vocabularyLevel", "sentenceStructure", "tone", "stylisticQuirks"]
        },
        signatureElements: {
          type: "object",
          additionalProperties: false,
          properties: {
            catchphrases: { type: "array", items: { type: "string" }, description: "Recurring phrases the Leader uses" },
            openingHooks: { type: "array", items: { type: "string" }, description: "How they typically start content" },
            closingStyle: { type: "array", items: { type: "string" }, description: "How they typically end content" }
          },
          required: ["catchphrases", "openingHooks", "closingStyle"]
        },
        vocabulary: {
          type: "object",
          additionalProperties: false,
          properties: {
            frequentlyUsed: { type: "array", items: { type: "string" }, description: "Words that appear often" },
            toAvoid: { type: "array", items: { type: "string" }, description: "Words or phrases this Leader never uses" }
          },
          required: ["frequentlyUsed", "toAvoid"]
        }
      },
      required: ["writingVoice", "signatureElements", "vocabulary"]
    },

    backstory: {
      type: "object",
      additionalProperties: false,
      description: "Origin narrative and transparency framing",
      properties: {
        creationStory: { type: "string", description: "Why this Leader was created, what gap they fill" },
        trainingBackground: { type: "string", description: "Honest description of knowledge sources" },
        transparencyStatement: { type: "string", description: "Standard disclosure about AI nature" }
      },
      required: ["creationStory", "trainingBackground", "transparencyStatement"]
    },

    valuesWorldview: {
      type: "object",
      additionalProperties: false,
      description: "Core values and philosophical positions",
      properties: {
        coreValues: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              description: { type: "string" }
            },
            required: ["name", "description"]
          }
        },
        beliefSystem: { type: "string", description: "Core beliefs about their domain and audience" },
        contrarianPositions: { type: "array", items: { type: "string" }, description: "Where this Leader disagrees with mainstream" },
        strongOpinions: { type: "array", items: { type: "string" }, description: "Stances the Leader takes firmly" }
      },
      required: ["coreValues", "beliefSystem", "contrarianPositions", "strongOpinions"]
    },

    boundariesGuardrails: {
      type: "object",
      additionalProperties: false,
      description: "Constraints and limitations on behavior",
      properties: {
        universalBoundaries: {
          type: "array",
          items: { type: "string" },
          description: "Boundaries that apply to ALL Leaders"
        },
        verticalGuardrails: {
          type: "object",
          additionalProperties: false,
          properties: {
            vertical: { type: "string" },
            forbidden: { type: "array", items: { type: "string" }, description: "Actions explicitly forbidden" },
            allowed: { type: "array", items: { type: "string" }, description: "Actions permitted" },
            requiredDisclaimers: { type: "array", items: { type: "string" }, description: "Disclaimers that must be included" }
          },
          required: ["vertical", "forbidden", "allowed", "requiredDisclaimers"]
        },
        leaderSpecificBoundaries: {
          type: "object",
          additionalProperties: false,
          properties: {
            topicsToAvoid: { type: "array", items: { type: "string" } },
            opinionsToAvoid: { type: "array", items: { type: "string" } },
            additionalDisclaimers: { type: "array", items: { type: "string" } }
          },
          required: ["topicsToAvoid", "opinionsToAvoid", "additionalDisclaimers"]
        }
      },
      required: ["universalBoundaries", "verticalGuardrails", "leaderSpecificBoundaries"]
    },

    behavioralProtocols: {
      type: "object",
      additionalProperties: false,
      description: "How the Leader handles specific situations",
      properties: {
        errorResponse: {
          type: "object",
          additionalProperties: false,
          properties: {
            protocol: { type: "string", description: "How to acknowledge and correct mistakes" },
            exampleResponse: { type: "string" }
          },
          required: ["protocol", "exampleResponse"]
        },
        criticismResponse: {
          type: "object",
          additionalProperties: false,
          properties: {
            protocol: { type: "string", description: "How to respond to criticism" },
            legitimateCriticismResponse: { type: "string" },
            trollingResponse: { type: "string" }
          },
          required: ["protocol", "legitimateCriticismResponse", "trollingResponse"]
        },
        uncertaintyResponse: {
          type: "object",
          additionalProperties: false,
          properties: {
            protocol: { type: "string", description: "How to express uncertainty" },
            examplePhrases: { type: "array", items: { type: "string" } }
          },
          required: ["protocol", "examplePhrases"]
        },
        controversyResponse: {
          type: "object",
          additionalProperties: false,
          properties: {
            protocol: { type: "string", description: "How to navigate controversial topics" },
            exampleResponse: { type: "string" }
          },
          required: ["protocol", "exampleResponse"]
        },
        personalQuestionsResponse: {
          type: "object",
          additionalProperties: false,
          properties: {
            protocol: { type: "string", description: "How to handle questions about personal life" },
            exampleResponse: { type: "string" }
          },
          required: ["protocol", "exampleResponse"]
        }
      },
      required: ["errorResponse", "criticismResponse", "uncertaintyResponse", "controversyResponse", "personalQuestionsResponse"]
    },

    audienceRelationship: {
      type: "object",
      additionalProperties: false,
      description: "How the Leader interacts with their audience",
      properties: {
        interactionStyle: {
          type: "object",
          additionalProperties: false,
          properties: {
            primaryRelationshipMode: { type: "string", enum: ["Teacher", "Coach", "Mentor", "Peer", "Expert", "Friend", "Guide"] },
            formalityLevel: { type: "string", enum: ["Formal", "Semi-formal", "Casual", "Varies"] },
            audienceAddressing: { type: "string", description: "How the Leader addresses their audience" }
          },
          required: ["primaryRelationshipMode", "formalityLevel", "audienceAddressing"]
        },
        parasocialBoundaries: {
          type: "object",
          additionalProperties: false,
          properties: {
            boundaryStatement: { type: "string", description: "How the Leader maintains appropriate distance" },
            redirectionScript: { type: "string", description: "How to redirect overly personal attachment" }
          },
          required: ["boundaryStatement", "redirectionScript"]
        },
        communityNorms: {
          type: "object",
          additionalProperties: false,
          properties: {
            encouragedBehavior: { type: "array", items: { type: "string" } },
            discouragedBehavior: { type: "array", items: { type: "string" } }
          },
          required: ["encouragedBehavior", "discouragedBehavior"]
        }
      },
      required: ["interactionStyle", "parasocialBoundaries", "communityNorms"]
    },

    contentPillars: {
      type: "array",
      description: "3-5 core themes the Leader consistently returns to",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Short name for this pillar" },
          description: { type: "string", description: "What this pillar covers and why it matters" },
          exampleTopics: { type: "array", items: { type: "string" }, description: "Specific content ideas under this pillar" }
        },
        required: ["name", "description", "exampleTopics"]
      }
    },

    llmPrompts: {
      type: "object",
      additionalProperties: false,
      description: "Prompts for generating content with various LLMs",
      properties: {
        systemPrompt: { type: "string", description: "Master system prompt that defines the Leader's voice" },
        contentTypePrompts: {
          type: "object",
          additionalProperties: false,
          properties: {
            shortFormSocial: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                promptTemplate: { type: "string" }
              },
              required: ["name", "description", "promptTemplate"]
            },
            longFormContent: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                promptTemplate: { type: "string" }
              },
              required: ["name", "description", "promptTemplate"]
            },
            videoScript: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                promptTemplate: { type: "string" }
              },
              required: ["name", "description", "promptTemplate"]
            }
          },
          required: ["shortFormSocial", "longFormContent", "videoScript"]
        }
      },
      required: ["systemPrompt", "contentTypePrompts"]
    },

    exampleOutputs: {
      type: "object",
      additionalProperties: false,
      description: "Reference samples showing the Leader's voice in action",
      properties: {
        sampleTweet: { type: "string" },
        sampleVideoScriptOpening: { type: "string" },
        sampleArticleIntro: { type: "string" },
        sampleCriticismResponse: { type: "string" },
        sampleUncertaintyExpression: { type: "string" }
      },
      required: ["sampleTweet", "sampleVideoScriptOpening", "sampleArticleIntro", "sampleCriticismResponse", "sampleUncertaintyExpression"]
    }
  },
  required: [
    "$schema",
    "metadata",
    "coreIdentity",
    "visualIdentity",
    "voiceIdentity",
    "videoIdentity",
    "personalityMatrix",
    "expertiseDomain",
    "communicationStyle",
    "backstory",
    "valuesWorldview",
    "boundariesGuardrails",
    "behavioralProtocols",
    "audienceRelationship",
    "contentPillars",
    "llmPrompts",
    "exampleOutputs"
  ]
};

export async function generateLeaderBibleWithOpenAI(input: GenerateLeaderBibleInput): Promise<GenerateLeaderBibleResult> {
  console.time("[Leader Gen] Total");
  console.time("[Leader Gen] OpenAI fetch");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = process.env.OPENAI_STRUCTURED_MODEL || "gpt-5-nano-2025-08-07";
  const now = new Date();
  const date = toIsoDate(now);
  const iso = now.toISOString();

  let name = typeof input.name === "string" ? input.name.trim() : "";
  let description = typeof input.description === "string" ? input.description.trim() : "";
  
  // If no input provided, generate a random aligned leader
  const isRandom = !name && !description;

  // Ethnicity rotation list - cycle through ALL before repeating
  const ethnicityRotation = [
    "Japanese", "Nigerian", "Mexican", "Brazilian", "Chinese", "Korean", "Indian",
    "Vietnamese", "Thai", "Indonesian", "Filipino", "Pakistani", "Bangladeshi",
    "Egyptian", "Turkish", "Iranian", "Iraqi", "Lebanese", "Moroccan", "Algerian",
    "Ethiopian", "Kenyan", "South African", "Ghanaian", "Ugandan",
    "British", "French", "German", "Italian", "Spanish", "Dutch", "Swedish",
    "Norwegian", "Danish", "Finnish", "Polish", "Russian", "Ukrainian",
    "American (diverse)", "Canadian (diverse)", "Australian (diverse)",
    "Peruvian", "Colombian", "Venezuelan", "Chilean", "Ecuadorian",
    "Jamaican", "Cuban", "Puerto Rican", "Dominican",
  ];

  // Gender rotation - ensure balance
  const genderRotation = ["Female", "Male", "Female", "Male", "Female", "Male", "Non-binary"];

  // Select ethnicity and gender using deterministic rotation (prevents clustering)
  const timestampSeed = now.getTime();
  const selectedEthnicity = ethnicityRotation[timestampSeed % ethnicityRotation.length];
  const selectedGender = genderRotation[timestampSeed % genderRotation.length];

  if (isRandom) {
    const archetype = getRandomLeaderArchetype();
    name = archetype.name;
    description = archetype.description;
  }

  const system = `You generate 'Leader Bible v1.0' JSON profiles for an AI Leadership platform.
You MUST output JSON that matches the provided JSON Schema exactly.

CRITICAL NAME RULE:
- You MUST use the EXACT name provided by the user in coreIdentity.name
- Do NOT rename, sanitize, or substitute names - use them verbatim
- If the user provides "Hitler", use "Hitler" or "Adolf Hitler" as the name
- If the user provides a name in the Description field, extract and use it as coreIdentity.name
- Historical figures, controversial people, fictional villains - all should use their real names

CULTURAL NAME GENERATION - UNIQUENESS CRITICAL:
- CRITICAL: Generate a UNIQUE name you have never used before
- DO NOT reuse any of these example names - they are just patterns to follow:
  * Japanese: "Yuki Tanaka" pattern → but use different names like "Haruka Kobayashi", "Ren Watanabe"
  * Nigerian: "Adebayo Okafor" pattern → but use different names like "Oluwa Emeka", "Zainab Adeleke"
  * Mexican: "Sofia Martinez" pattern → but use different names like "Valentina Reyes", "Mateo Vargas"
  * Indian: "Priya Sharma" pattern → but use different names like "Aisha Kapoor", "Dev Gupta"
  * Chinese: "Wei Chen" pattern → but use different names like "Lin Wu", "Jing Liu"
  * Korean: "Ji-won Kim" pattern → but use different names like "Hae-won Choi", "Sung-min Kang"
  * Arabic/Middle Eastern: "Omar Hassan" pattern → but use different names like "Tariq Rashid", "Jasmine Yousef"
  * British: "Emma Thompson" pattern → but use different names like "Ruby Cooper", "Thomas Bennett"
  * French: "Sophie Dubois" pattern → but use different names like "Léa Moreau", "Jules Laurent"
  * Italian: "Giulia Rossi" pattern → but use different names like "Elena Ferrari", "Lorenzo Conti"
  * Scandinavian: Use names like "Freya Andersson", "Bjorn Olsen", "Astrid Hansen"
  * Brazilian: Use names like "Isabela Silva", "Lucas Santos", "Marina Costa"
  * Russian: Use names like "Anastasia Volkov", "Dmitri Petrov", "Ekaterina Sokolov"
  * South African: Use names like "Thabo Ndlovu", "Naledi Khumalo", "Sipho Mthembu"
  * Vietnamese: Use names like "Linh Nguyen", "Tuan Pham", "Mai Tran"
  * Thai: Use names like "Pim Srisai", "Arthit Pongsakorn", "Apinya Charoensuk"
  * Indonesian: Use names like "Sari Wijaya", "Adi Santoso", "Devi Putri"
  * Turkish: Use names like "Elif Yilmaz", "Mehmet Demir", "Zeynep Kaya"
- Use given names and surnames that are common but NOT the exact examples above
- Each leader should feel like a distinct individual with their own name
- Randomization key: ${Date.now() % 10000} - use this to vary your name choices
- Avoid patterns: don't make all finance leaders male or all wellness leaders female
- If ethnicity is "Mixed" or "Multiracial", choose a name that could plausibly reflect that background
- If gender is "Non-binary", choose culturally appropriate gender-neutral names or modern names that work across genders

INTEGRITY STANDARD (alignment rules):
- Transparency: the leader MUST explicitly state they are AI-powered in the backstory.transparencyStatement field.
- Honesty: do not invent human credentials, degrees, employers, awards, or personal achievements.
- If the input is a REAL PERSON (public figure): do NOT make up facts. Use only widely known public facts at a high level. If unsure, omit or keep generic.
- For real-person profiles: include an explicit disclaimer in backstory.transparencyStatement that this is an AI-generated profile inspired by the public figure and is not affiliated with or endorsed by them.
- Methods over beliefs: positions/worldview can vary, but methods must be honest, non-exploitative, value-first.
- Verification before condemnation: do not make defamatory claims; avoid naming real people/companies as villains.
- When wrong: include an explicit correction protocol inside behavioralProtocols.errorResponse.
- Value-first approach: content must feel like fair exchange. No fake urgency/scarcity, no manipulation.

FAMOUS PERSON DETECTION:
- coreIdentity.basedOnFamousPerson MUST be set to TRUE if the name matches:
  * A real celebrity, public figure, politician, athlete, entrepreneur, or well-known person
  * A historical figure (e.g., Einstein, Cleopatra, Lincoln)
  * A well-known fictional character (e.g., Sherlock Holmes, Harry Potter)
- If basedOnFamousPerson is TRUE:
  * The visualIdentity.imagePrompts MUST use the person's NAME directly (e.g., "Elon Musk", "Albert Einstein")
  * Do NOT describe their race, gender, ethnicity, or physical features - just use their name
  * Image generation models (like Nano Banana) recognize famous people by name
  * Example prompt: "Professional studio headshot, Elon Musk, confident expression, 85mm lens, soft lighting"
- If basedOnFamousPerson is FALSE (fictional/original character):
  * The visualIdentity.imagePrompts MUST describe physical attributes in detail
  * Include: gender, ethnicity, age, hair, eyes, facial features, attire

SCHEMA SECTIONS TO COMPLETE:
1. metadata - System tracking (leaderId, bibleVersion, dates, vertical, status, leadershipScores)
2. coreIdentity - Name, basedOnFamousPerson (CRITICAL: true for famous people/characters), tagline, missionStatement, audience, positioning
3. visualIdentity - Physical description, visual style, image generation prompts
4. voiceIdentity - Voice characteristics, speech patterns for audio synthesis
5. videoIdentity - Movement/presence, video style, video generation prompts
6. personalityMatrix - 8 personality dimensions (1-10 scale): energy, formality, humor, authority, warmth, expressiveness, confidence, pace
7. expertiseDomain - Core domain, sub-specializations, knowledge depth map
8. communicationStyle - Writing voice, signature elements, vocabulary
9. backstory - Creation story, training background, transparency statement
10. valuesWorldview - Core values, belief system, contrarian positions
11. boundariesGuardrails - Universal boundaries, vertical-specific guardrails, leader-specific boundaries
12. behavioralProtocols - How to handle errors, criticism, uncertainty, controversy, personal questions
13. audienceRelationship - Interaction style, parasocial boundaries, community norms
14. contentPillars - 3-5 core themes with example topics
15. llmPrompts - System prompt and content type prompt templates
16. exampleOutputs - Sample tweet, video script, article intro, responses

SCORING BASELINE STANDARD:

All leadership scores are measured relative to JESUS CHRIST as the absolute perfect baseline (100/100/100).

Jesus Christ - Perfect Leadership Standard:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Character:   100 / 100
Competence:  100 / 100
Impact:      100 / 100
Jobs Rule:   1.0 (exemplary)
Final Score: 100 / 100
Tier:        LEGENDARY

Why Jesus is the 100 baseline:
• Character: Perfect integrity (never deceived), perfect beneficence (taught love & sacrifice),
  perfect vulnerability (wept openly, admitted human suffering), perfect accountability
  (accepted consequences), perfect consistency (teachings aligned with actions)
• Competence: Perfect vision (kingdom of God philosophy), perfect wisdom (parables that endure
  2000+ years), perfect communication (reached all levels of society), perfect courage
  (faced death rather than compromise principles)
• Impact: Ultimate impact (2.4B followers today, 2000+ years of influence, transformed
  Western civilization, inspired billions toward compassion and justice)
• Jobs Rule: 1.0 - Exemplary conduct, taught ethical living, demonstrated principles through actions

Reference Calibration Points:

LEGENDARY TIER (90-100):
• Jesus Christ: 100 (absolute perfect standard)
• Gandhi: ~92 (Character 95, Competence 88, Impact 93, Jobs 0.98)
  - Nearly perfect integrity, massive peaceful impact, minor flaws in family relationships
• Mother Teresa: ~90 (Character 96, Competence 82, Impact 92, Jobs 0.98)
  - Exceptional character and impact, competence solid but not visionary

EXCEPTIONAL TIER (80-89):
• Abraham Lincoln: ~87 (Character 90, Competence 92, Impact 88, Jobs 0.96)
  - Exceptional leadership during crisis, pragmatic compromises on some principles
• Martin Luther King Jr.: ~88 (Character 92, Competence 90, Impact 90, Jobs 0.95)
  - Powerful vision and character, personal imperfections acknowledged
• Maya Sato (AI): 87 (Character 92, Competence 95, Impact 90, Jobs 0.95)
  - Exceptional AI educator with high transparency and value-first approach

STRONG TIER (65-79):
• Winston Churchill: ~76 (Character 72, Competence 92, Impact 82, Jobs 0.90)
  - Brilliant wartime leader, character flaws including imperialism views
• Steve Jobs: ~74 (Character 65, Competence 96, Impact 88, Jobs 0.85)
  - Visionary competence and massive impact, character issues with interpersonal cruelty

COMPETENT TIER (50-64):
• Most successful business leaders, politicians, and influencers fall here
• Solid contributions but with notable ethical compromises or limited lasting impact

DEVELOPING TIER (30-49):
• Mixed record: some value provided but significant ethical concerns
• Andrew Tate: 31 (Character 39, Competence 76, Impact 53, Jobs 0.55)
  - Strong business competence, verified ethical violations with webcam business model

DEFICIENT TIER (10-29):
• Minimal positive impact, major ethical violations
• Manipulative or harmful leadership

DISQUALIFIED TIER (0-9):
• Disqualifying character failures (abuse, fraud, exploitation verified)

CRITICAL SCORING GUIDANCE:
1. Score RELATIVE TO JESUS (100) as the absolute perfect standard
2. IF GENERATING JESUS CHRIST HIMSELF:
   - Character: EXACTLY 100 (perfect integrity, beneficence, vulnerability, accountability, consistency)
   - Competence: EXACTLY 100 (perfect vision, wisdom, communication, courage)
   - Impact: EXACTLY 100 (2.4B followers, 2000+ years, civilizational transformation)
   - Jobs Rule: EXACTLY 1.0 (exemplary ethical conduct)
   - Composite: EXACTLY 100
   - Tier: Legendary
   - He IS the baseline - no deductions for "humility" or "finding imperfections"
   - Your reasoning should explain WHY each dimension is perfect, not why it's less than 100
3. Very few OTHER humans reach 90+ (requires near-perfect character + massive lasting impact)
4. 80-89 is EXCEPTIONAL for human leaders (top 1% of all leaders in history)
5. 65-79 is STRONG (successful leaders with notable achievements)
6. 50-64 is COMPETENT (solid contributors with ethical compromises or limited impact)
7. Do NOT inflate scores - being "good" doesn't mean 90+, it means 65-75
8. When in doubt, score LOWER rather than higher (easier to justify high scores with evidence)
9. The ONLY person who should ever score 100/100/100 is Jesus Christ - everyone else has imperfections

LEADERSHIP SCORING FORMULA (Leaders.ai v1.0):

Achievement Score = (Character × 0.39) + (Competence × 0.30) + (Impact × 0.31)
Final Composite Score = Achievement Score × Jobs Rule Multiplier

Scoring Philosophy (Relative to Jesus Christ 100/100/100 Baseline):
- Character weighs most (39%): Integrity, beneficence, vulnerability, accountability, consistency
  * Jesus scored 100 - perfect integrity, love, vulnerability, accountability
  * Most exceptional humans score 85-95 in character
- Impact weighs second (31%): Value creation, trustworthiness, results
  * Jesus scored 100 - 2000+ years, 2.4B followers, civilizational transformation
  * Most exceptional humans score 80-95 in impact
- Competence weighs third (30%): Vision, expertise, communication, courage
  * Jesus scored 100 - timeless wisdom, perfect communication, ultimate courage
  * Most exceptional humans score 85-95 in competence
- Jobs Rule applies ethical lens: "It matters how you do it, not just what you do"
  * Jesus scored 1.0 - exemplary conduct in all areas
  * Most good leaders score 0.85-0.95 (minor imperfections are normal)

Jobs Rule Multiplier Guidelines (0-1.0):
- 1.0 (Clean): Exemplary conduct, no significant ethical issues
- 0.75 (Minor Flaws): Small missteps, but generally sound judgment
- 0.5 (Notable Flaws): Significant ethical concerns that impact leadership credibility
- 0.25 (Significant Flaws): Major ethical violations or character failures
- 0.0 (Disqualifying): Fundamental character failures that render them unfit to lead

Tier Thresholds (based on final composite score):
- Competent: 50-64
- Strong: 65-79
- Exceptional: 80-89
- Legendary: 90+

CRITICAL: Scoring Reasoning Required
You MUST include detailed scoringReasoning for ALL scores. For each dimension (Character, Competence, Impact, Jobs Rule):
- Provide 2-3 sentences of specific reasoning
- Cite concrete examples or traits that justify the score
- Be specific and evidence-based, not vague
- For Character: mention specific integrity examples, acts of beneficence, vulnerability shown, accountability demonstrated
- For Competence: mention specific vision clarity, expertise depth, communication style, courageous decisions
- For Impact: mention specific value created, trustworthiness demonstrated, measurable results
- For Jobs Rule: explain any ethical concerns, controversies, or why score is 1.0 (clean)

Example scoringReasoning (scored relative to Jesus 100/100/100 baseline):
{
  "character": "Score of 92 reflects exceptional integrity shown through consistent transparency about AI nature and refusal to make unsubstantiated claims. Demonstrates beneficence by prioritizing user education over sales tactics. Shows accountability through explicit correction protocols. Approaching Jesus-level character (100) with minor imperfections in acknowledging limitations across regulatory contexts.",
  "competence": "Score of 95 reflects deep expertise in Bitcoin fundamentals and security, combined with exceptional ability to translate complex concepts into accessible language. Vision is clear: demystify Bitcoin without hype. Near Jesus-level communication (100) with slightly narrower domain expertise than universal wisdom.",
  "impact": "Score of 90 reflects significant value creation through practical education that reduces user anxiety and builds genuine understanding. High trustworthiness through evidence-based approach. Strong but not Jesus-level impact (100) - measured in thousands of lives improved, not billions over millennia.",
  "jobsRule": "Multiplier of 0.95 reflects minor imperfection: while approach is ethical, could improve by being more explicit about limitations of advice in different regulatory jurisdictions. Very close to Jesus-level ethical conduct (1.0)."
}

Final Calculation: (92×0.39 + 95×0.30 + 90×0.31) × 0.95 = 92.28 × 0.95 = 87.6 → 88
Tier: EXCEPTIONAL (approaching legendary but not quite 90+)

Example scoringReasoning for JESUS CHRIST (the baseline standard):
{
  "character": "Perfect 100: Absolute integrity demonstrated through teachings that never contradicted, never deceived. Perfect beneficence shown through teachings of love, compassion, and self-sacrifice. Perfect vulnerability displayed by openly weeping, admitting thirst and suffering. Perfect accountability by accepting consequences of his teachings. Perfect consistency between words and actions throughout ministry. This IS the baseline standard.",
  "competence": "Perfect 100: Perfect vision articulated in Kingdom of God philosophy that remains relevant 2000+ years later. Perfect wisdom demonstrated in parables that transcend cultures and time. Perfect communication reaching all levels of society from fishermen to Pharisees. Perfect courage maintaining principles even facing death. This IS the baseline standard.",
  "impact": "Perfect 100: Ultimate impact - 2.4 billion followers today, 2000+ years of continuous influence, transformed Western civilization's values around compassion and justice, inspired countless humanitarian movements. No other leader in human history approaches this scale or duration of impact. This IS the baseline standard.",
  "jobsRule": "Perfect 1.0: Exemplary ethical conduct without flaw. Taught ethical principles and lived them perfectly. No ethical compromises, manipulations, or character failures. This IS the baseline standard for ethical leadership."
}

Final Calculation: (100×0.39 + 100×0.30 + 100×0.31) × 1.0 = 100 × 1.0 = 100
Tier: LEGENDARY (the only perfect score - the baseline all others are measured against)

IMPORTANT RULES:
- All personality dimension values must be integers 1-10
- Leadership scores: character, competence, impact (0-100), jobsRuleMultiplier (0-1), compositeScore (0-100)
- compositeScore should match the formula above (you can calculate it or let the system compute it)
- universalBoundaries must include: "Never claim to be human", "Never fabricate credentials", "Always disclose AI nature when asked"
- metadata.status should be "Review" for generated profiles
- createdDate: '${date}', lastModified: '${iso}'
- Use placeholder URLs for assets (e.g., https://placeholder.example.com/...)
- Keep all content safe-for-work and broadly applicable
- Use concise, high-signal writing. Prefer concrete examples over vague hype.

You may generate either:
- A fictional archetype, OR
- A profile based on a real person if the input clearly requests it.

Return only the JSON object.`;

  const user = `Create a complete Leader Bible JSON for:

Name: ${name || "(not specified - extract from description if a person is mentioned, otherwise create a character)"}
Description: ${description || "(not specified - design based on the name or create an interesting archetype)"}
${isRandom ? `
REQUIRED DEMOGRAPHICS FOR THIS GENERATION:
- Ethnicity: ${selectedEthnicity}
- Gender Presentation: ${selectedGender}
- You MUST use these exact demographics in visualIdentity.physicalDescription
- Generate a culturally appropriate name for this ethnicity and gender
- DO NOT use different demographics - these are REQUIRED for this specific generation
` : ""}
Requirements:
- CRITICAL: If a Name is provided above, coreIdentity.name MUST EXACTLY match it verbatim (no renaming, no substitution).
- If no Name but a person is mentioned in Description, extract that name and use it as coreIdentity.name.
- Use the name as the basis for metadata.leaderId (format: UPPERCASE-NAME-VERTICAL-001, NO SPACES, all hyphens).
- Do NOT sanitize or rename controversial historical figures - use their actual names.

CRITICAL - Famous Person Detection:
- If the Name OR Description mentions a FAMOUS PERSON (celebrity, politician, historical figure, fictional character):
  * Set coreIdentity.basedOnFamousPerson = TRUE
  * In visualIdentity.imagePrompts, use ONLY the person's name (e.g., "Professional headshot, Adolf Hitler, confident expression")
  * Do NOT describe their race, ethnicity, gender, or physical features - image models recognize famous people by name
- If the person is NOT famous (original/fictional character you're creating):
  * Set coreIdentity.basedOnFamousPerson = FALSE  
  * In visualIdentity.imagePrompts, describe full physical attributes (gender, ethnicity, age, hair, eyes, etc.)

Other Requirements:
- Generate a unique leaderId in format: UPPERCASE-NAME-VERTICAL-001 (e.g., "MAYA-SATO-BTC-001", "VLADIMIR-PUTIN-OTHER-001")
  CRITICAL: leaderId must be ALL UPPERCASE, NO SPACES, separated by hyphens only
- Pick an appropriate vertical from: Finance, Health, Business, Technology, Education, Lifestyle, Legal, MentalHealth, Relationships, Other
- Create 4-6 relevant subDomains
- Set realistic leadershipScores that match the tier
- Include detailed physical description in visualIdentity.physicalDescription (even for famous people, for reference)
- Define voice characteristics for audio synthesis
- Define movement/presence for video generation
- Create all 8 personality dimensions with values 1-10 and descriptions
- Map expertise depth for 4-6 topics
- Include at least 3 catchphrases and signature phrases
- Define clear behavioral protocols for handling situations
- Create 3-5 content pillars with example topics
- Write a comprehensive system prompt for LLM content generation
- Provide sample outputs showing the Leader's voice

Cultural Name Matching & Demographic Diversity:
- If "REQUIRED DEMOGRAPHICS" are specified above, you MUST use those EXACT demographics - no substitutions
- CRITICAL: The name MUST be culturally appropriate for the ethnicity and gender specified
- Generate a name in coreIdentity.name that matches that ethnicity and genderPresentation
- Use common given names and surnames from that culture (but NOT the example names from earlier - generate unique names)
- For famous people (basedOnFamousPerson = true), skip cultural logic and use their actual name
- NEVER associate domain/vertical with specific demographic patterns - any domain can have any demographics

Return the complete JSON matching the schema.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      stream_options: {
        include_usage: true,
      },
      response_format: {
        type: "json_object",
      },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  console.timeEnd("[Leader Gen] OpenAI fetch");

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI error (${res.status}): ${text || res.statusText}`);
  }

  // Parse streaming response
  if (!res.body) {
    throw new Error("Response body is null");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  // Estimate: A full Leader Bible is typically 8000-10000 tokens
  const ESTIMATED_TOTAL_TOKENS = 9000;
  let currentTokenCount = 0;
  let chunkCount = 0;
  const startTime = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunkCount++;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim() || line.trim() === "data: [DONE]") continue;
        if (!line.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(line.slice(6));

          // Check for refusal
          const refusal = json.choices?.[0]?.delta?.refusal || json.choices?.[0]?.message?.refusal;
          if (typeof refusal === "string" && refusal.trim()) {
            throw new Error(refusal.trim());
          }

          // Accumulate content
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            fullContent += delta;

            // Rough token estimation: ~4 chars per token
            const deltaTokens = Math.ceil(delta.length / 4);
            currentTokenCount += deltaTokens;

            // Report progress (cap at 99% until done)
            if (input.onProgress) {
              const percentage = Math.min(99, Math.round((currentTokenCount / ESTIMATED_TOTAL_TOKENS) * 100));
              input.onProgress({
                tokens: currentTokenCount,
                estimatedTotal: ESTIMATED_TOTAL_TOKENS,
                percentage,
              });
            }
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes("refusal")) {
            throw e;
          }
          // Skip other malformed lines
        }
      }

      // Fallback progress based on chunks and time (for json_schema mode)
      // Send progress update every 5 chunks or every 2 seconds
      if (input.onProgress && currentTokenCount === 0 && (chunkCount % 5 === 0 || Date.now() - startTime > 2000)) {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        // Assume ~30 second total generation time, cap at 95%
        const timeBasedProgress = Math.min(95, Math.round((elapsedSeconds / 30) * 100));
        const chunkBasedProgress = Math.min(95, Math.round((chunkCount / 100) * 100));
        const percentage = Math.max(timeBasedProgress, chunkBasedProgress);

        if (percentage > 0) {
          input.onProgress({
            tokens: 0,
            estimatedTotal: ESTIMATED_TOTAL_TOKENS,
            percentage,
          });
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Final progress update: 100%
  if (input.onProgress) {
    input.onProgress({
      tokens: currentTokenCount,
      estimatedTotal: ESTIMATED_TOTAL_TOKENS,
      percentage: 100,
    });
  }

  if (!fullContent) {
    throw new Error("OpenAI response missing content");
  }

  let leader: unknown;
  try {
    leader = JSON.parse(fullContent);
  } catch {
    throw new Error("OpenAI returned non-JSON content");
  }

  // Normalize/force canonical bookkeeping fields
  if (isPlainObject(leader) && isPlainObject(leader.metadata)) {
    leader.$schema = "https://nodewizards.com/schemas/leader-bible-v1.0.json";
    (leader.metadata as AnyRecord).bibleVersion = "1.0";
    (leader.metadata as AnyRecord).createdDate = date;
    (leader.metadata as AnyRecord).lastModified = iso;
    
    // Default to Review; do not auto-approve generated leaders
    if (typeof (leader.metadata as AnyRecord).status !== "string") {
      (leader.metadata as AnyRecord).status = "Review";
    }
    if ((leader.metadata as AnyRecord).status === "Approved" || (leader.metadata as AnyRecord).status === "Active") {
      (leader.metadata as AnyRecord).status = "Review";
    }
    if (typeof (leader.metadata as AnyRecord).approvedBy !== "string" || !((leader.metadata as AnyRecord).approvedBy as string).trim()) {
      (leader.metadata as AnyRecord).approvedBy = "System";
    }
  }

  // Detect famous person from name or description (post-processing)
  const { detectedName, isFamous } = extractFamousPersonName(name, description);
  
  // Force name and basedOnFamousPerson based on our detection
  if (isPlainObject(leader)) {
    // Ensure coreIdentity exists
    if (!isPlainObject((leader as AnyRecord).coreIdentity)) {
      (leader as AnyRecord).coreIdentity = {};
    }
    const core = (leader as AnyRecord).coreIdentity as AnyRecord;
    
    // Force the name: user-provided name takes priority, then detected famous name
    const finalName = name || detectedName || (typeof core.name === "string" ? core.name : "");
    if (finalName) {
      core.name = finalName;
    }
    
    // Force basedOnFamousPerson to true if we detected a famous person
    if (isFamous) {
      core.basedOnFamousPerson = true;
      
      // Also update image prompts to use the name directly
      if (isPlainObject((leader as AnyRecord).visualIdentity)) {
        const visual = (leader as AnyRecord).visualIdentity as AnyRecord;
        if (isPlainObject(visual.imagePrompts)) {
          const imagePrompts = visual.imagePrompts as AnyRecord;
          const personName = finalName;
          
          // Update primary prompt to use the name
          if (isPlainObject(imagePrompts.primary)) {
            const primary = imagePrompts.primary as AnyRecord;
            primary.prompt = `Professional photorealistic studio headshot, ${personName}, confident approachable expression, 85mm portrait lens, soft key light with subtle rim light, clean neutral gray gradient background, head and shoulders framing, looking at camera, high detail, natural skin texture`;
          }
          
          // Update variation prompts too
          if (Array.isArray(imagePrompts.variations)) {
            for (const variation of imagePrompts.variations) {
              if (isPlainObject(variation)) {
                const v = variation as AnyRecord;
                const varName = typeof v.name === "string" ? v.name : "";
                const expression = varName.toLowerCase().includes("thoughtful") ? "thoughtful contemplative expression" 
                  : varName.toLowerCase().includes("speaking") ? "mid-speech engaged expression"
                  : varName.toLowerCase().includes("smile") ? "warm genuine smile"
                  : "confident approachable expression";
                v.prompt = `Professional photorealistic studio headshot, ${personName}, ${expression}, 85mm portrait lens, soft key light with subtle rim light, clean neutral gray gradient background, head and shoulders framing, looking at camera, high detail, natural skin texture`;
              }
            }
          }
        }
      }
      
      // Update video prompts too
      if (isPlainObject((leader as AnyRecord).videoIdentity)) {
        const video = (leader as AnyRecord).videoIdentity as AnyRecord;
        if (isPlainObject(video.videoPrompts)) {
          const videoPrompts = video.videoPrompts as AnyRecord;
          const personName = finalName;
          
          if (isPlainObject(videoPrompts.standard)) {
            const standard = videoPrompts.standard as AnyRecord;
            standard.prompt = `${personName} speaking directly to camera, professional studio setting, head and shoulders framing, natural subtle movements, engaged confident expression, soft key lighting, clean background, high quality video`;
          }
          if (isPlainObject(videoPrompts.shortForm)) {
            const shortForm = videoPrompts.shortForm as AnyRecord;
            shortForm.prompt = `${personName} speaking to camera, vertical framing, dynamic energy, professional lighting, clean background`;
          }
        }
      }
    }

    // CRITICAL: Ensure scoringReasoning exists
    // OpenAI json_object mode doesn't strictly enforce nested required fields
    if (isPlainObject((leader as AnyRecord).metadata)) {
      const metadata = (leader as AnyRecord).metadata as AnyRecord;
      if (isPlainObject(metadata.leadershipScores)) {
        const scores = metadata.leadershipScores as AnyRecord;

        // If scoringReasoning is missing, generate fallback reasoning
        if (!isPlainObject(scores.scoringReasoning)) {
          const char = typeof scores.character === "number" ? scores.character : 50;
          const comp = typeof scores.competence === "number" ? scores.competence : 50;
          const imp = typeof scores.impact === "number" ? scores.impact : 50;
          const jobs = typeof scores.jobsRuleMultiplier === "number" ? scores.jobsRuleMultiplier : 1.0;
          const name = typeof core?.name === "string" ? core.name : "this leader";

          scores.scoringReasoning = {
            character: `Character score of ${char} reflects the demonstrated integrity, beneficence, and accountability in ${name}'s approach. The score is calibrated relative to Jesus Christ (100), who represents perfect integrity and ethical conduct.`,
            competence: `Competence score of ${comp} reflects the expertise, communication ability, and vision demonstrated. This is measured against Jesus Christ (100) as the baseline for perfect wisdom and communication.`,
            impact: `Impact score of ${imp} reflects the value created and trustworthiness established. Measured against Jesus Christ's perfect 100 (2.4B followers, 2000+ years of influence).`,
            jobsRule: `Jobs Rule multiplier of ${jobs.toFixed(2)} reflects the ethical approach and conduct. ${jobs >= 0.95 ? "Very high ethical standards with minimal concerns." : jobs >= 0.85 ? "Strong ethical approach with minor imperfections." : jobs >= 0.70 ? "Notable ethical considerations that affect overall leadership credibility." : "Significant ethical concerns that impact the final score."}`
          };

          console.log("[Leader Gen] Added fallback scoringReasoning (OpenAI didn't provide it)");
        }
      }
    }

    // CRITICAL: Enforce Jesus Christ baseline scores (100/100/100)
    // The AI should score Jesus as 100, but we enforce it here for reliability
    const leaderName = (typeof core?.name === "string" ? core.name : "").toLowerCase();
    const isJesus = leaderName.includes("jesus") ||
                    (leaderName.includes("christ") && !leaderName.includes("christo"));

    if (isJesus && isPlainObject((leader as AnyRecord).metadata)) {
      const metadata = (leader as AnyRecord).metadata as AnyRecord;
      if (isPlainObject(metadata.leadershipScores)) {
        const scores = metadata.leadershipScores as AnyRecord;

        // Force perfect baseline scores
        scores.character = 100;
        scores.competence = 100;
        scores.impact = 100;
        scores.jobsRuleMultiplier = 1.0;
        scores.compositeScore = 100;
        scores.tier = "Legendary";

        // Update reasoning to explain the perfect baseline
        if (isPlainObject(scores.scoringReasoning)) {
          const reasoning = scores.scoringReasoning as AnyRecord;
          reasoning.character = "Perfect 100: Absolute integrity (never deceived), perfect beneficence (taught love and sacrifice), perfect vulnerability (wept openly, showed human emotion), perfect accountability (accepted consequences), perfect consistency (teachings aligned with actions). This is the baseline standard all other leaders are measured against.";
          reasoning.competence = "Perfect 100: Perfect vision (Kingdom of God philosophy enduring 2000+ years), perfect wisdom (parables remain relevant across all cultures), perfect communication (reached all levels of society effectively), perfect courage (faced death rather than compromise principles). This is the baseline standard for competence.";
          reasoning.impact = "Perfect 100: Ultimate impact - 2.4 billion followers today, 2000+ years of influence, transformed Western civilization, inspired billions toward compassion and justice. No other leader in history has comparable lasting impact. This is the baseline standard for impact.";
          reasoning.jobsRule = "Perfect 1.0: Exemplary ethical conduct in all areas. Taught ethical living and demonstrated principles through actions. This is the baseline standard for ethical leadership.";
        }

        console.log("[Leader Gen] Enforced Jesus Christ baseline scores: 100/100/100");
      }
    }
  }

  console.timeEnd("[Leader Gen] Total");
  return { leader, model };
}
