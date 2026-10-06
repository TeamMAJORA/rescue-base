// Orange "?" with a hover / focus popup
export default function InfoTip({ text }) {
    return (
        <span className="admin-info-tip" tabIndex={0} aria-label={text}>
            ?
            <span className="admin-info-tip-bubble" role="tooltip">
                {text}
            </span>
        </span>
    );
}