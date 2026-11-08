from typing import List, Dict, Any
import re

class ASTAnalyzer:
    @staticmethod
    def analyze(content: str, file_path: str) -> Dict[str, Any]:
        lines = content.splitlines()
        fn_count = sum(1 for line in lines if re.search(r'\b(def|function|async function|const \w+ = async|=>)\b', line))
        class_count = sum(1 for line in lines if re.search(r'\bclass\b', line))
        branch_count = sum(1 for line in lines if re.search(r'\b(if|elif|else if|switch|case|catch|for|while)\b', line))
        
        return {
            "filePath": file_path,
            "cyclomaticComplexity": max(1, branch_count + 1),
            "functionsCount": fn_count,
            "classesCount": class_count,
            "symbols": [],
        }
