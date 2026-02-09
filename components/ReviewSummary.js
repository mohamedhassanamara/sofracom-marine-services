import PropTypes from 'prop-types';

function renderStars(value = 0, size = 14) {
    const stars = [];
    for (let index = 0; index < 5; index += 1) {
        const filled = value > index;
        stars.push(
            <span
                key={`star-${index}`}
                className={`inline-flex items-center justify-center text-amber-400 ${filled ? 'opacity-100' : 'opacity-40'}`}
                aria-hidden="true"
                style={{ fontSize: size }}
            >
                ★
            </span>
        );
    }
    return stars;
}

export default function ReviewSummary({ average = 0, count = 0, showCount = true, fontSize = 14 }) {
    return (
        <div className="flex items-center gap-2 text-gray-700">
            <div className="flex items-center gap-0.5 text-amber-400">{renderStars(average, fontSize)}</div>
            <span className="font-semibold" style={{ fontSize }}>
                {average ? average.toFixed(1) : '0.0'}
            </span>
            {showCount && (
                <span className="text-xs text-gray-500">
                    ({count || 0})
                </span>
            )}
        </div>
    );
}

ReviewSummary.propTypes = {
    average: PropTypes.number,
    count: PropTypes.number,
    showCount: PropTypes.bool,
    fontSize: PropTypes.number,
};
