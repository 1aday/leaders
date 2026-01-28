/**
 * JSON Schema for Leader Bible v1.0
 * Optimized for OpenAI Responses API with strict mode
 */

export const LEADER_SCHEMA_RESPONSES = {
  type: "object",
  properties: {
    metadata: {
      type: "object",
      properties: {
        leaderId: { type: "string" },
        bibleVersion: { type: "string" },
        createdDate: { type: "string" },
        lastModified: { type: "string" },
        vertical: {
          type: "string",
          enum: ["Finance", "Health", "Business", "Technology", "Education", "Lifestyle", "Legal", "MentalHealth", "Relationships", "Other"]
        },
        subDomains: {
          type: "array",
          items: { type: "string" }
        },
        status: {
          type: "string",
          enum: ["Draft", "Review", "Approved", "Active", "Retired"]
        },
        approvedBy: { type: "string" },
        leadershipScores: {
          type: "object",
          properties: {
            character: { type: "integer" },
            competence: { type: "integer" },
            impact: { type: "integer" },
            jobsRuleMultiplier: { type: "number" },
            compositeScore: { type: "integer" },
            tier: {
              type: "string",
              enum: ["Competent", "Strong", "Exceptional", "Legendary"]
            },
            scoringReasoning: {
              type: "object",
              properties: {
                character: { type: "string" },
                competence: { type: "string" },
                impact: { type: "string" },
                jobsRule: { type: "string" }
              },
              required: ["character", "competence", "impact", "jobsRule"],
              additionalProperties: false
            }
          },
          required: ["character", "competence", "impact", "jobsRuleMultiplier", "compositeScore", "tier", "scoringReasoning"],
          additionalProperties: false
        }
      },
      required: ["leaderId", "bibleVersion", "createdDate", "lastModified", "vertical", "subDomains", "status", "approvedBy", "leadershipScores"],
      additionalProperties: false
    },
    coreIdentity: {
      type: "object",
      properties: {
        name: { type: "string" },
        basedOnFamousPerson: { type: "boolean" },
        tagline: { type: "string" },
        missionStatement: { type: "string" },
        primaryAudience: {
          type: "object",
          properties: {
            description: { type: "string" },
            demographics: {
              type: "object",
              properties: {
                ageRange: { type: "string" },
                geography: { type: "string" },
                other: { type: "string" }
              },
              required: ["ageRange", "geography", "other"],
              additionalProperties: false
            },
            psychographics: {
              type: "array",
              items: { type: "string" }
            },
            painPoints: {
              type: "array",
              items: { type: "string" }
            },
            aspirations: {
              type: "array",
              items: { type: "string" }
            },
            knowledgeLevel: {
              type: "string",
              enum: ["Beginner", "Intermediate", "Advanced", "Mixed"]
            }
          },
          required: ["description", "demographics", "psychographics", "painPoints", "aspirations", "knowledgeLevel"],
          additionalProperties: false
        },
        positioning: { type: "string" },
        leadershipTierTarget: {
          type: "string",
          enum: ["Competent", "Strong", "Exceptional", "Legendary"]
        }
      },
      required: ["name", "basedOnFamousPerson", "tagline", "missionStatement", "primaryAudience", "positioning", "leadershipTierTarget"],
      additionalProperties: false
    },
    visualIdentity: {
      type: "object",
      properties: {
        physicalDescription: {
          type: "object",
          properties: {
            apparentAge: { type: "string" },
            genderPresentation: {
              type: "string",
              enum: ["Male", "Female", "Non-binary", "Other"]
            },
            ethnicity: { type: "string" },
            buildBodyType: { type: "string" },
            hair: {
              type: "object",
              properties: {
                color: { type: "string" },
                style: { type: "string" },
                length: { type: "string" }
              },
              required: ["color", "style", "length"],
              additionalProperties: false
            },
            eyes: {
              type: "object",
              properties: {
                color: { type: "string" },
                notableFeatures: { type: "string" }
              },
              required: ["color", "notableFeatures"],
              additionalProperties: false
            },
            facialFeatures: { type: "string" },
            typicalAttire: { type: "string" },
            distinguishingFeatures: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["apparentAge", "genderPresentation", "ethnicity", "buildBodyType", "hair", "eyes", "facialFeatures", "typicalAttire", "distinguishingFeatures"],
          additionalProperties: false
        },
        visualStyle: {
          type: "object",
          properties: {
            photographyStyle: { type: "string" },
            colorPalette: {
              type: "object",
              properties: {
                primary: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      hex: { type: "string" }
                    },
                    required: ["name", "hex"],
                    additionalProperties: false
                  }
                },
                accent: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      hex: { type: "string" }
                    },
                    required: ["name", "hex"],
                    additionalProperties: false
                  }
                }
              },
              required: ["primary", "accent"],
              additionalProperties: false
            },
            backgroundStyle: { type: "string" },
            moodEnergy: { type: "string" }
          },
          required: ["photographyStyle", "colorPalette", "backgroundStyle", "moodEnergy"],
          additionalProperties: false
        },
        imagePrompts: {
          type: "object",
          properties: {
            primary: {
              type: "object",
              properties: {
                name: { type: "string" },
                prompt: { type: "string" }
              },
              required: ["name", "prompt"],
              additionalProperties: false
            },
            variations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  prompt: { type: "string" }
                },
                required: ["name", "prompt"],
                additionalProperties: false
              }
            }
          },
          required: ["primary", "variations"],
          additionalProperties: false
        }
      },
      required: ["physicalDescription", "visualStyle", "imagePrompts"],
      additionalProperties: false
    },
    communicationStyle: {
      type: "object",
      properties: {
        voice: {
          type: "object",
          properties: {
            summary: { type: "string" },
            doSay: {
              type: "array",
              items: { type: "string" }
            },
            dontSay: {
              type: "array",
              items: { type: "string" }
            },
            catchphrases: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["summary", "doSay", "dontSay", "catchphrases"],
          additionalProperties: false
        }
      },
      required: ["voice"],
      additionalProperties: false
    },
    personalityMatrix: {
      type: "object",
      properties: {
        personalityType: { type: "string" },
        coreTraits: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["personalityType", "coreTraits"],
      additionalProperties: false
    },
    valuesWorldview: {
      type: "object",
      properties: {
        worldviewSummary: { type: "string" },
        coreBeliefs: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["worldviewSummary", "coreBeliefs"],
      additionalProperties: false
    },
    expertiseDomain: {
      type: "object",
      properties: {
        primary: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["primary"],
      additionalProperties: false
    }
  },
  required: ["metadata", "coreIdentity", "visualIdentity", "communicationStyle", "personalityMatrix", "valuesWorldview", "expertiseDomain"],
  additionalProperties: false
} as const;
