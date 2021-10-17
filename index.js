let config = {
    "language": "c",
    "colors": {
        "default": "#888",
        "Operator": "#6495ed",
        "DoubleOperator": "#0047c5",
        "Symbol": "#1f355d",
        "Keyword": "#d6440c",
        "Identifier": "#8e8989",
        "Number": "#08964e",
        "Float": "#03522a",
        "String": "#d68e0a",
        "Char": "#f7be56",
    },
    "indent": {
        "type": "whitespace",
        "count": 4,
    },
    "line_end_value": [
        ";",
        "\n",
    ],
    "wrap": {
        "matchs": {
            "{": "}",
            "}": "{",
        },
        "left": ["{"],
        "right": ["}"],
    },
};
let tool = {
    isLineEndToken(token) {
        return config.line_end_value.indexOf(token.value) >= 0;
    },
    isTokenNeedWrap(token) {
        let tokenValue = token.value;
        return typeof config['wrap']['matchs'][tokenValue] !== 'undefined';
    },
    isSet(key, obj) {
        return typeof obj[key] !== 'undefined';
    },
    peekToken(tokens, index) {
        if (index > tokens.length - 1) {
            throw new Error("token index out of range");
        }
        return tokens[index];
    },
    preHandleTokens(tokens) {
        let stack = [];
        let length = tokens.length;
        for (let i = 0; i <= length - 1; ++i) {
            tokens[i].extra = {
                is_line_end: this.isLineEndToken(tokens[i]),
            };
            if (!this.isTokenNeedWrap(tokens[i])) {
                continue;
            }

            let lastIndex = stack.length - 1;
            let tokenValue = tokens[i].value;
            if (stack.length && config['wrap']['matchs'][tokenValue] === stack[lastIndex].token_value) {
                let element = stack.pop();
                tokens[element.token_index].extra.pairStartIndex = element.token_index;
                tokens[element.token_index].extra.pairEndIndex = i;
                tokens[i].extra.pairStartIndex = element.token_index;
                tokens[i].extra.pairEndIndex = i;
            } else {
                stack.push({
                    token_value: tokenValue,
                    token_index: i,
                });
            }
        }
        return tokens;
    }
};
let core = {
    setup(paramConfig) {
        config = Object.assign(config, paramConfig);
        if (config.language === 'c') {
            lexer = chainLexer.cLexer;
        }
    },
    traverseTokens(tokens) {
        let result = [];
        let line = 1;
        let code = '';
        let indent = 0;
        let blocks = [];
        let index = 0;
        for (let token of tokens) {
            let tokenValue = token.value;
            let tokenType = token.type;
            let content = '';
            if (tokenType === 'Operator' || tokenType === 'DoubleOperator') {
                content = (" " + tokenValue + " ");
            } else if (tokenType === 'Symbol') {
                if (tokenValue === ',') {
                    content = (tokenValue + ' ');
                } else {
                    content = tokenValue;
                }
            } else if (tokenType === 'Keyword') {
                content = (tokenValue + ' ');
            } else {
                content = tokenValue;
            }
            code += content;
            blocks.push({
                'content': content,
                'color': tool.isSet(token.type, config.colors) ? config.colors[token.type] : config.colors.default,
                'token': token,
            });

            if (tool.isTokenNeedWrap(token) || tool.isLineEndToken(token)) {
                result.push({
                    'line': line,
                    'code': code,
                    'indent': indent,
                    'blocks': blocks,
                });
                if (tool.isTokenNeedWrap(token)) {
                    if (config.wrap.left.indexOf(token.value) >= 0) {
                        ++indent;
                    } else {
                        --indent;
                    }
                }
                line++;
                code = '';
                blocks = [];
            }
            ++index;
        }
        result.push({
            'line': line,
            'code': code,
            'indent': indent,
            'blocks': blocks,
        });
        return result;
    },
    format(code) {
        lexer.start(code);
        let parsedTokens = tool.preHandleTokens(lexer.DFA.result.tokens);
        return this.traverseTokens(parsedTokens);
    }
};

if (typeof module !== 'undefined') {
    module.exports = {
        setup: core.setup,
        format: core.format,
    };
}
