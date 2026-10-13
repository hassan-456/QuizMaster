/** Bundled JavaScript quiz. `answer` is the index of the correct option. */
const quiz = {
    version: 2,
    title: 'JavaScript Quiz',
    pointsPerQuestion: 10,
    passPercentage: 50,
    durationSeconds: 300,
    questions: [
        {
            question: 'Which keyword declares a block-scoped variable that can be reassigned?',
            options: ['var', 'let', 'const', 'function'],
            answer: 1
        },
        {
            question: 'What does typeof null return in JavaScript?',
            options: ['"null"', '"undefined"', '"object"', '"boolean"'],
            answer: 2
        },
        {
            question: 'Which method turns a JavaScript value into a JSON string?',
            options: ['JSON.parse()', 'JSON.stringify()', 'JSON.convert()', 'toJSONString()'],
            answer: 1
        },
        {
            question: 'What is the value of the expression 2 + "2"?',
            options: ['4', '"22"', 'NaN', 'undefined'],
            answer: 1
        },
        {
            question: 'Which array method creates a new array with only the elements that pass a test?',
            options: ['map()', 'filter()', 'reduce()', 'forEach()'],
            answer: 1
        },
        {
            question: 'What does the strict equality operator === compare?',
            options: ['Value only', 'Value and type', 'Type only', 'Memory size only'],
            answer: 1
        },
        {
            question: 'Which expression creates a new Promise?',
            options: ['new Promise()', 'Promise.make()', 'createPromise()', 'Promise.new()'],
            answer: 0
        },
        {
            question: 'A closure is a function that:',
            options: [
                'Cannot read variables outside its own body',
                'Remembers variables from the scope where it was created',
                'Can only run one time',
                'Must be written with the function keyword'
            ],
            answer: 1
        },
        {
            question: 'Which method adds one or more elements to the end of an array?',
            options: ['push()', 'pop()', 'shift()', 'join()'],
            answer: 0
        },
        {
            question: 'Which statement about const is correct?',
            options: [
                'It makes every nested value immutable',
                'It prevents reassignment of the binding',
                'It is function-scoped, like var',
                'It cannot store objects or arrays'
            ],
            answer: 1
        }
    ]
};

export default quiz;
