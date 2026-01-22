import React from 'react';

const Spinner = ({ color = 'border-white', size = 'h-5 w-5' }) => (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 border-transparent ${color} ${size}`} style={{ borderColor: color, borderTopColor: 'transparent', borderBottomColor: 'transparent' }}></div>
);

export default Spinner;