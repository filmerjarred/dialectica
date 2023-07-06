export const tagInfo = {
   tagTypes: ["AGGREGATE", "TRUTH", "RELEVANCE", "MORAL", "ANSWER", "PARAPHRASE-ACCURACY"],

   tagTypeInfo: [
      {
         tagTypeId: "AGGREGATE",
         intentionTypes: ["CLAIM", "PARAPHRASE", "OFFERING", "SEEMING", "BLANK"],
         qualifier: "feels",
      },
      {
         tagTypeId: "TRUTH",
         intentionTypes: ["CLAIM", "PARAPHRASE", "OFFERING", "SEEMING", "BLANK"],
         qualifier: "seems",
      },
      {
         tagTypeId: "RELEVANCE",
         intentionTypes: ["CLAIM", "PARAPHRASE", "OFFERING", "SEEMING", "QUESTION", "BLANK"],
         qualifier: "feels",
      },
      {
         tagTypeId: "MORAL",
         intentionTypes: ["CLAIM", "PARAPHRASE", "OFFERING", "SEEMING", "BLANK"],
         qualifier: "feels",
      },
      {
         tagTypeId: "PARAPHRASE-ACCURACY",
         intentionTypes: ["PARAPHRASE"],
         qualifier: "feels",
      },
   ],

   tags: [
      // AGGREGATE
      {
         id: "RIGHT",
         tagType: "AGGREGATE",
         name: "right",
         description: "This is in harmony with my sense of what is true, good, and relevant (alt + 1)",
         hiddenOption: false,
      },
      {
         id: "OKAY",
         tagType: "AGGREGATE",
         name: "Read",
         description: "I read this and it neither seemed right nor wrong",
         hiddenOption: false,
      },
      {
         id: "DISSONANT",
         tagType: "AGGREGATE",
         name: "dissonant",
         description: "This generates errors in my brain (alt + 2)",
         hiddenOption: false,
      },

      // TRUTH
      {
         id: "FACT",
         tagType: "TRUTH",
         name: "true",
         description: "Seems almost certain to be true",
         hiddenOption: false,
      },
      {
         id: "PROBABLE",
         tagType: "TRUTH",
         name: "likely",
         description: "Seems more likely than not this is true",
         hiddenOption: true,
      },
      {
         id: "THESIS",
         tagType: "TRUTH",
         name: "likely",
         deprecated: true,
         description: "Seems more likely than not this is true",
         hiddenOption: true,
      },
      {
         id: "POSSIBILITY",
         tagType: "TRUTH",
         name: "possible",
         description: "Seems possible enough to be true to be worth exploring",
         hiddenOption: true,
      },
      {
         id: "UNLIKELY",
         tagType: "TRUTH",
         name: "unlikely",
         description: "Seems likely to be false than true",
         hiddenOption: true,
      },
      {
         id: "FALSE",
         tagType: "TRUTH",
         name: "false",
         description: "Seems more likely than not this is true",
         hiddenOption: false,
      },

      // RELEVANCE
      {
         id: "SACRED",
         tagType: "RELEVANCE",
         name: "sacred",
         description: "This has very high personal relevance/salience to me and my world view",
         hiddenOption: true,
      },
      {
         id: "CRUX",
         tagType: "RELEVANCE",
         name: "central",
         description: "My overall opinion hinges quite strongly on this, it seems quite central",
         hiddenOption: true,
      },
      {
         id: "IMPORTANT",
         tagType: "RELEVANCE",
         name: "important",
         deprecated: true,
         description: "This feels important to me",
         hiddenOption: false,
      },
      {
         id: "RELEVANT",
         tagType: "RELEVANCE",
         name: "relevant",
         deprecated: true,
         description: "Seems at least somewhat relevant to the discussion in some way",
         hiddenOption: false,
      },
      {
         id: "DIGRESSION",
         tagType: "RELEVANCE",
         name: "tangential",
         description: "Seems like a digression from question",
         hiddenOption: false,
      },

      // MORAL
      {
         id: "GOOD",
         tagType: "MORAL",
         name: "good",
         description: "Seems if people held this view it would be good",
         hiddenOption: false,
      },
      {
         id: "BAD",
         tagType: "MORAL",
         name: "bad",
         description: "Seems if people held this view it would be bad",
         hiddenOption: false,
      },

      // PARAPHRASE-ACCURACY
      {
         id: "FAITHFUL",
         tagType: "PARAPHRASE-ACCURACY",
         name: "faithful",
         description: "This is a faithful depiction of what it's attempting to paraphrase",
         hiddenOption: false,
      },
      {
         id: "DISTORTED",
         tagType: "PARAPHRASE-ACCURACY",
         name: "distorted",
         description: "This is a not quite what I meant",
         hiddenOption: false,
      },
   ],
}
