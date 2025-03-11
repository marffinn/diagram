import { Handle, Position } from 'reactflow';
import { useState, useEffect } from 'react';
import './TimerNode.css';

const TimerNode = ({ id, data, onNodeDataChange }) => {
    const [createdAt, setCreatedAt] = useState(data.created_at || Date.now());

    useEffect(() => {
        if (!data.created_at) {
            updateNode();
        }
    }, []);

    const updateNode = () => {
        const newData = { created_at: createdAt };
        console.log('Updating TimerNode:', { id, ...newData });
        onNodeDataChange(id, newData);
        fetch(`http://localhost:3000/api/nodes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ x: data.x, y: data.y, type: 'timer', ...newData })
        }).catch(err => console.error('Error updating timer:', err));
    };

    const formatTime = (timestamp) => new Date(parseInt(timestamp)).toLocaleString();

    return (
        <div className="timer-node">
            <Handle type="target" position={Position.Left} className="handle" />
            <div className="timer-title">Timer Created:</div>
            <div className="timer-time">{formatTime(createdAt)}</div>
            <Handle type="source" position={Position.Right} className="handle" />
        </div>
    );
};

export default TimerNode;