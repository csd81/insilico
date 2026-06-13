// Help entries for the Text Analytics Toolbox, extracted from textanalytics.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_TEXTANALYTICS: Record<string, HelpEntry | string> = {
    tokenizedDocument: {
      summary: 'Array of tokenized documents',
      syntax: ['documents = tokenizedDocument(str)', 'documents = tokenizedDocument(cellstr)'],
      description: [
        'documents = tokenizedDocument(str) splits the string into tokens (words) by whitespace and punctuation, lowercases all tokens, and returns a tokenizedDocument object.',
        'documents = tokenizedDocument(cellstr) tokenizes each string in the cell array and returns an array of tokenized documents.',
        'Access tokens via documents.NumDocuments and documents.NumTokens. Pass to bagOfWords or removeStopWords for further processing.',
      ],
      seealso: ['bagOfWords', 'removeStopWords', 'tfidf', 'fitlda'],
    },
    removeStopWords: {
      summary: 'Remove stop words from tokenized documents',
      syntax: ['documents = removeStopWords(documents)', 'documents = removeStopWords(documents,customWords)'],
      description: [
        'documents = removeStopWords(documents) removes common English stop words (the, a, is, and, …) from each tokenized document.',
        'removeStopWords(documents,customWords) additionally removes the words listed in the cell array customWords.',
        'Built-in list includes ~130 common English stop words.',
      ],
      seealso: ['tokenizedDocument', 'bagOfWords', 'normalizeWords'],
    },
    bagOfWords: {
      summary: 'Bag-of-words model',
      syntax: ['bag = bagOfWords(documents)', 'bag = bagOfWords(documents,customVocab)'],
      description: [
        'bag = bagOfWords(documents) creates a bag-of-words model from a tokenizedDocument array.',
        'bag.Vocabulary lists all unique words in first-appearance order (matching MATLAB).',
        'bag.Counts is an [nDocs × nVocab] matrix of word occurrence counts.',
        'bag.NumDocuments and bag.NumWords give the corpus and vocabulary sizes.',
        'Pass bag to tfidf for TF-IDF weighting or fitlda for topic modelling.',
      ],
      seealso: ['tokenizedDocument', 'tfidf', 'fitlda', 'removeStopWords'],
    },
    tfidf: {
      summary: 'TF-IDF matrix',
      syntax: ['M = tfidf(bag)', 'M = tfidf(bag,documents)'],
      description: [
        'M = tfidf(bag) returns an [nDocs × nVocab] matrix of TF-IDF weights.',
        'TF(d,w) = count(d,w)   (raw term frequency, no per-document normalisation)',
        'IDF(w) = log(N / df(w))   (no smoothing; 0 if the word occurs in every document)',
        'TFIDF(d,w) = TF(d,w) * IDF(w), matching the MATLAB default.',
        'Use for document similarity, clustering, or as feature matrix for classifiers.',
      ],
      seealso: ['bagOfWords', 'fitlda', 'tokenizedDocument'],
    },
    fitlda: {
      summary: 'Fit latent Dirichlet allocation (LDA) topic model',
      syntax: ['mdl = fitlda(bag,numTopics)', "mdl = fitlda(bag,numTopics,'NumIterations',200)"],
      description: [
        'mdl = fitlda(bag,K) fits a K-topic LDA model to the bag-of-words corpus using collapsed Gibbs sampling.',
        'Default priors: α = 50/K (document-topic), β = 0.1 (topic-word). Default 100 Gibbs iterations.',
        'mdl.TopicWordProbabilities is [K × V]: P(word | topic).',
        'mdl.DocumentTopicProbabilities is [nDocs × K]: P(topic | document).',
        'mdl.Perplexity measures model fit (lower = better).',
        "Options: 'NumIterations' (default 100), 'Alpha' (default 50/K), 'Beta' (default 0.1).",
      ],
      seealso: ['bagOfWords', 'tfidf', 'tokenizedDocument'],
    },
  };
