import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setAnswerAction } from '../redux/result_reducer';

export default function Questions() {
    const { trace, queue } = useSelector(state => state.questions);
    const result = useSelector(state => state.result.result);
    const dispatch = useDispatch();
    const question = queue[trace];

    if (!question) {
        return <h3 className="text-light">No question is available for this step.</h3>;
    }

    const options = Array.isArray(question.options) ? question.options : [];
    const selected = result[trace];

    function onSelect(index) {
        dispatch(setAnswerAction({ trace, checked: index }));
    }

    return (
        <div className="questions">
            <h2 className="text-light">{question.question}</h2>
            <ul key={trace}>
                {options.map((option, index) => {
                    const id = `q${trace}-option-${index}`;
                    return (
                        <li key={id}>
                            <input
                                type="radio"
                                value={index}
                                checked={selected === index}
                                name={`question-${trace}`}
                                id={id}
                                onChange={() => onSelect(index)}
                            />
                            <label className="text-primary" htmlFor={id}>{option}</label>
                            <div className={`check ${selected === index ? 'checked' : ''}`}></div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
