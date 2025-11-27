"""
Text normalization and matching utilities
Handles accent removal, stemming, and intent detection
"""
import re
import logging
from typing import List, Dict, Optional, Tuple
from unidecode import unidecode

logger = logging.getLogger(__name__)

# Common Portuguese word endings to remove for stemming
PORTUGUESE_SUFFIXES = [
    's', 'es', 'ões', 'oes', 'ão', 'ao', 'ões', 'oes',
    'ar', 'er', 'ir', 'ado', 'ido', 'ada', 'ida',
    'mente', 'ção', 'cao', 'ções', 'coes'
]

# Intent patterns for advanced detection
INTENT_PATTERNS = {
    'catalog': {
        'keywords': ['lista', 'preço', 'preco', 'catálogo', 'catalogo', 'produto', 'menu', 'cardapio', 'cardápio'],
        'synonyms': ['ver produtos', 'mostrar produtos', 'quais produtos', 'o que tem', 'o que vende'],
        'patterns': [r'\b(preço|preco|preços|precos)\b', r'\b(catálogo|catalogo)\b', r'\b(lista|listagem)\b']
    },
    'greeting': {
        'keywords': ['olá', 'ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi'],
        'synonyms': ['bom dia', 'boa tarde', 'boa noite'],
        'patterns': [r'\b(olá|ola|oi)\b', r'\b(bom dia|boa tarde|boa noite)\b']
    },
    'help': {
        'keywords': ['ajuda', 'help', 'como', 'como funciona', 'informação', 'informacao'],
        'synonyms': ['preciso ajuda', 'como funciona', 'me ajuda', 'pode ajudar'],
        'patterns': [r'\b(ajuda|help)\b', r'\b(como funciona|como usar)\b']
    },
    'contact': {
        'keywords': ['contato', 'contato', 'telefone', 'endereço', 'endereco', 'localização', 'localizacao'],
        'synonyms': ['onde fica', 'endereço', 'telefone', 'contato'],
        'patterns': [r'\b(contato|telefone|endereço|endereco)\b']
    },
    'order': {
        'keywords': ['pedido', 'comprar', 'quero', 'encomenda', 'encomendar'],
        'synonyms': ['fazer pedido', 'quero comprar', 'como comprar', 'fazer encomenda'],
        'patterns': [r'\b(pedido|comprar|quero)\b']
    }
}


def normalize_text(text: str, remove_accents: bool = True, stem: bool = False) -> str:
    """
    Normalize text for matching:
    - Lowercase
    - Remove accents (optional)
    - Remove extra spaces
    - Basic stemming (optional)
    
    Args:
        text: Input text
        remove_accents: Whether to remove accents
        stem: Whether to apply basic stemming
    
    Returns:
        Normalized text
    """
    if not text:
        return ""
    
    # Lowercase and strip
    normalized = text.lower().strip()
    
    # Remove accents
    if remove_accents:
        normalized = unidecode(normalized)
    
    # Remove extra spaces
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # Basic stemming (remove common Portuguese suffixes)
    if stem:
        normalized = apply_basic_stemming(normalized)
    
    return normalized


def apply_basic_stemming(text: str) -> str:
    """
    Apply basic stemming for Portuguese words
    Removes common suffixes to improve matching
    
    Args:
        text: Input text
    
    Returns:
        Stemmed text
    """
    words = text.split()
    stemmed_words = []
    
    for word in words:
        # Try to remove suffixes (longest first)
        stemmed = word
        for suffix in sorted(PORTUGUESE_SUFFIXES, key=len, reverse=True):
            if word.endswith(suffix) and len(word) > len(suffix) + 2:
                stemmed = word[:-len(suffix)]
                break
        stemmed_words.append(stemmed)
    
    return ' '.join(stemmed_words)


def partial_match(text: str, keyword: str, threshold: float = 0.7) -> bool:
    """
    Check if keyword matches text with partial matching
    Supports:
    - Exact substring match
    - Partial word match (e.g., "preço" matches "preços")
    - Similarity threshold (optional)
    
    Args:
        text: Normalized text to search in
        keyword: Normalized keyword to find
        threshold: Similarity threshold (0-1) for fuzzy matching
    
    Returns:
        True if match found
    """
    if not text or not keyword:
        return False
    
    # Exact substring match
    if keyword in text:
        return True
    
    # Partial word match (keyword is part of a word in text)
    words = text.split()
    for word in words:
        # Check if keyword is substring of word or vice versa
        if keyword in word or word in keyword:
            # Ensure minimum length to avoid false positives
            if len(keyword) >= 3 and len(word) >= 3:
                return True
    
    # Check if words share common root (basic)
    keyword_stem = apply_basic_stemming(keyword)
    for word in words:
        word_stem = apply_basic_stemming(word)
        if keyword_stem == word_stem:
            return True
        # Check if one is substring of the other after stemming
        if keyword_stem in word_stem or word_stem in keyword_stem:
            if len(keyword_stem) >= 3:
                return True
    
    return False


def detect_intent(text: str, intent_type: str = None) -> Optional[Tuple[str, float]]:
    """
    Detect intent from text using patterns, keywords, and synonyms
    
    Args:
        text: Input text
        intent_type: Specific intent to check (optional)
    
    Returns:
        Tuple of (intent_name, confidence) or None
    """
    if not text:
        return None
    
    normalized = normalize_text(text, remove_accents=True, stem=True)
    
    # Check specific intent or all intents
    intents_to_check = [intent_type] if intent_type else INTENT_PATTERNS.keys()
    
    best_match = None
    best_confidence = 0.0
    
    for intent_name in intents_to_check:
        if intent_name not in INTENT_PATTERNS:
            continue
        
        intent_data = INTENT_PATTERNS[intent_name]
        confidence = 0.0
        
        # Check keywords (exact match = high confidence)
        for keyword in intent_data['keywords']:
            normalized_keyword = normalize_text(keyword, remove_accents=True, stem=True)
            if partial_match(normalized, normalized_keyword):
                confidence = max(confidence, 0.9)
        
        # Check synonyms (partial match = medium confidence)
        for synonym in intent_data.get('synonyms', []):
            normalized_synonym = normalize_text(synonym, remove_accents=True, stem=True)
            if partial_match(normalized, normalized_synonym):
                confidence = max(confidence, 0.7)
        
        # Check regex patterns (pattern match = high confidence)
        for pattern in intent_data.get('patterns', []):
            if re.search(pattern, normalized, re.IGNORECASE):
                confidence = max(confidence, 0.85)
        
        # Update best match
        if confidence > best_confidence:
            best_confidence = confidence
            best_match = intent_name
    
    if best_confidence >= 0.5:  # Minimum confidence threshold
        return (best_match, best_confidence)
    
    return None


def match_keywords_in_text(text: str, keywords: List[str], use_partial: bool = True) -> bool:
    """
    Check if any keyword matches in text with improved matching
    
    Args:
        text: Text to search in
        keywords: List of keywords to find
        use_partial: Whether to use partial matching
    
    Returns:
        True if any keyword matches
    """
    if not text or not keywords:
        return False
    
    normalized_text = normalize_text(text, remove_accents=True, stem=True)
    
    for keyword in keywords:
        normalized_keyword = normalize_text(keyword.strip(), remove_accents=True, stem=True)
        
        if use_partial:
            if partial_match(normalized_text, normalized_keyword):
                return True
        else:
            if normalized_keyword in normalized_text:
                return True
    
    return False

