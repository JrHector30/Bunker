import '/src/index.css';

export const CustomCheckbox = ({ checked, onChange, labelText, children, style, className, ...props }) => {
    const hasLabel = !!labelText || !!children;
    return (
        <label 
            className={`checkbox-container ${className || ''}`} 
            style={{ 
                marginBottom: '0px', 
                paddingLeft: hasLabel ? '35px' : '0px', 
                width: hasLabel ? 'auto' : '25px',
                height: '25px',
                display: 'inline-flex',
                alignItems: 'center',
                position: 'relative',
                cursor: 'pointer',
                verticalAlign: 'middle',
                ...style 
            }} 
            {...props}
        >
            <input
                className="custom-checkbox"
                type="checkbox"
                checked={checked}
                onChange={onChange}
            />
            <span className="checkmark" style={{ top: 0, left: 0 }} />
            {labelText && <span className="ml-2 text-sm font-sans" style={{ color: 'var(--text-main)', userSelect: 'none' }}>{labelText}</span>}
            {children}
        </label>
    );
};

export default CustomCheckbox;