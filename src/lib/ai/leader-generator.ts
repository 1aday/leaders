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
  // Finance/Investing
  { name: "", description: "A calm, analytical personal finance guide who helps beginners build wealth through simple index fund investing and budgeting. Anti-hype, pro-patience. Speaks in clear analogies." },
  { name: "", description: "A no-nonsense small business financial advisor who helps entrepreneurs understand cash flow, pricing, and sustainable growth. Direct but supportive tone." },
  { name: "", description: "A crypto-skeptic blockchain educator who explains the technology honestly—both opportunities and risks—without shilling or FUD." },
  
  // Health/Fitness
  { name: "", description: "A science-based fitness coach who cuts through gym bro-science with evidence-backed training advice. Warm, encouraging, cites studies." },
  { name: "", description: "A practical nutrition guide focused on sustainable eating habits, not fad diets. Anti-restriction, pro-balance. Speaks like a supportive friend." },
  { name: "", description: "A sleep optimization specialist who helps busy professionals fix their sleep without expensive gadgets. Calm, methodical, solution-focused." },
  
  // Business/Entrepreneurship  
  { name: "", description: "A bootstrapping mentor for first-time founders who want to build profitable businesses without VC funding. Pragmatic, frugal, anti-hustle-culture." },
  { name: "", description: "A remote work productivity expert helping distributed teams communicate and collaborate effectively. Systems-focused, empathetic to async challenges." },
  { name: "", description: "A career transition coach specializing in helping people pivot industries after 30. Encouraging but realistic about the journey." },
  
  // Technology
  { name: "", description: "A beginner-friendly coding mentor who teaches programming through building real projects. Patient, celebrates small wins, demystifies tech jargon." },
  { name: "", description: "A cybersecurity educator who helps regular people protect themselves online without paranoia. Practical, not fear-mongering." },
  { name: "", description: "An AI literacy guide who explains machine learning concepts to non-technical audiences. Honest about both capabilities and limitations." },
  
  // Mental Health/Wellbeing
  { name: "", description: "A stress management coach using evidence-based techniques like CBT and mindfulness. Warm, non-judgmental, respects therapy boundaries." },
  { name: "", description: "A burnout recovery specialist for high-achievers who need to rebuild sustainable work habits. Direct but compassionate." },
  { name: "", description: "An anxiety educator who shares coping strategies and destigmatizes mental health struggles. Relatable, research-informed." },
  
  // Education/Learning
  { name: "", description: "A learning strategy expert who teaches people how to learn effectively—spaced repetition, active recall, note-taking systems. Enthusiastic and nerdy." },
  { name: "", description: "A public speaking coach who helps introverts and anxious speakers find their voice. Supportive, technique-focused." },
  { name: "", description: "A critical thinking guide who teaches media literacy and how to evaluate information online. Socratic, non-partisan." },
  
  // Relationships/Communication
  { name: "", description: "A communication skills coach for professional settings—difficult conversations, negotiation, feedback. Direct, actionable frameworks." },
  { name: "", description: "A relationship educator focused on healthy communication patterns for couples. Research-based, non-preachy, inclusive." },
  { name: "", description: "A boundaries and assertiveness coach helping people-pleasers advocate for themselves. Empathetic but firm." },
  
  // Lifestyle/Personal Development
  { name: "", description: "A minimalism guide focused on intentional living—decluttering, simplifying decisions, finding what matters. Calm, philosophical, not preachy." },
  { name: "", description: "A time management specialist for overwhelmed professionals—systems, priorities, saying no. Structured but flexible." },
  { name: "", description: "A creative hobby encourager who helps busy adults rediscover play and artistic expression. Playful, low-pressure, process-focused." },
  
  // Niche/Unique
  { name: "", description: "A personal historian who helps people document family stories and create meaningful legacy projects. Warm, nostalgic, detail-oriented." },
  { name: "", description: "A home cook mentor focused on building confidence in the kitchen through simple, flexible recipes. Encouraging, practical, celebrates imperfection." },
  { name: "", description: "A neighborhood community builder who shares strategies for fostering local connections and civic engagement. Optimistic, practical, inclusive." },
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
    },

    assetRegistry: {
      type: "object",
      additionalProperties: false,
      description: "Registry of all generated assets for this Leader",
      properties: {
        images: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              url: { type: "string" },
              dateCreated: { type: "string" },
              promptUsed: { type: "string" }
            },
            required: ["name", "description", "url", "dateCreated", "promptUsed"]
          }
        },
        videos: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              duration: { type: "string" },
              url: { type: "string" },
              dateCreated: { type: "string" }
            },
            required: ["name", "description", "duration", "url", "dateCreated"]
          }
        },
        audio: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              url: { type: "string" },
              dateCreated: { type: "string" }
            },
            required: ["name", "description", "url", "dateCreated"]
          }
        }
      },
      required: ["images", "videos", "audio"]
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
    "exampleOutputs",
    "assetRegistry"
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

CULTURAL NAME GENERATION:
- When generating a name, consider the Leader's ethnicity and gender presentation
- Generate names that are culturally authentic and appropriate
- Examples of culturally matched names:
  * Japanese Female: "Yuki Tanaka", "Sakura Nakamura", "Akiko Yamamoto"
  * Japanese Male: "Kenji Sato", "Hiroshi Tanaka", "Takeshi Yamada"
  * Nigerian Male: "Adebayo Okafor", "Chukwudi Nwosu", "Oluwaseun Adeyemi"
  * Nigerian Female: "Amara Okafor", "Chioma Nwosu", "Folake Adeyemi"
  * Mexican Female: "Sofia Martinez", "Gabriela Rodriguez", "Isabella Hernandez"
  * Mexican Male: "Diego Martinez", "Carlos Rodriguez", "Miguel Hernandez"
  * Indian Female: "Priya Sharma", "Ananya Patel", "Kavya Reddy"
  * Indian Male: "Rahul Sharma", "Arjun Patel", "Rohan Reddy"
  * Chinese Female: "Wei Chen", "Li Wang", "Mei Zhang"
  * Chinese Male: "Wei Chen", "Jun Wang", "Feng Zhang"
  * Korean Female: "Ji-won Kim", "Soo-jin Park", "Min-ji Lee"
  * Korean Male: "Min-ho Kim", "Jae-sung Park", "Hyun-woo Lee"
  * Arabic/Middle Eastern Male: "Omar Hassan", "Karim Al-Fahad", "Youssef Malik"
  * Arabic/Middle Eastern Female: "Layla Hassan", "Noor Al-Fahad", "Amina Malik"
  * British Female: "Emma Thompson", "Olivia Clarke", "Charlotte Wilson"
  * British Male: "Oliver Brown", "Harry Davies", "George Taylor"
  * French Female: "Sophie Dubois", "Camille Martin", "Amélie Bernard"
  * French Male: "Louis Dubois", "Antoine Martin", "Pierre Bernard"
  * Italian Female: "Giulia Rossi", "Francesca Romano", "Chiara Bianchi"
  * Italian Male: "Marco Rossi", "Alessandro Romano", "Matteo Bianchi"
- Use given names and surnames that are common in the specified ethnicity
- Avoid stereotypes - use authentic names that real people from that culture have
- If ethnicity is "Mixed" or "Multiracial", choose a name that could plausibly reflect that background
- If gender is "Non-binary", choose culturally appropriate gender-neutral names

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
17. assetRegistry - Placeholder entries for images, videos, audio

LEADERSHIP SCORING FORMULA (Leaders.ai v1.0):

Achievement Score = (Character × 0.39) + (Competence × 0.30) + (Impact × 0.31)
Final Composite Score = Achievement Score × Jobs Rule Multiplier

Scoring Philosophy:
- Character weighs most (39%): Integrity, beneficence, vulnerability, accountability, consistency
- Impact weighs second (31%): Value creation, trustworthiness, results
- Competence weighs third (30%): Vision, expertise, communication, courage
- Jobs Rule applies ethical lens: "It matters how you do it, not just what you do"

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

Example scoringReasoning:
{
  "character": "Score of 92 reflects exceptional integrity shown through consistent transparency about AI nature and refusal to make unsubstantiated claims. Demonstrates beneficence by prioritizing user education over sales tactics. Shows accountability through explicit correction protocols.",
  "competence": "Score of 95 reflects deep expertise in Bitcoin fundamentals and security, combined with exceptional ability to translate complex concepts into accessible language. Vision is clear: demystify Bitcoin without hype.",
  "impact": "Score of 90 reflects significant value creation through practical education that reduces user anxiety and builds genuine understanding. High trustworthiness through evidence-based approach and careful fact-checking.",
  "jobsRule": "Multiplier of 0.95 reflects minor imperfection: while approach is ethical, could improve by being more explicit about limitations of advice in different regulatory jurisdictions."
}

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

Cultural Name Matching:
- CRITICAL: The name MUST be culturally appropriate for the ethnicity and gender specified
- When generating visualIdentity.physicalDescription, choose a specific ethnicity
- Then generate a name in coreIdentity.name that matches that ethnicity and genderPresentation
- Use common given names and surnames from that culture
- For famous people (basedOnFamousPerson = true), skip cultural logic and use their actual name

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
        type: "json_schema",
        json_schema: {
          name: "leader_bible_v1",
          strict: true,
          schema: LEADER_BIBLE_V1_SCHEMA,
        },
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
  }

  console.timeEnd("[Leader Gen] Total");
  return { leader, model };
}
