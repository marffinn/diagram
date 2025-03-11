import { Handle, Position, useReactFlow } from 'reactflow';
import { useState, useRef, useEffect } from 'react';
import './NoteNode.css';

const NoteNode = ({ id, data, onNodeDataChange }) => {
    const [notes, setNotes] = useState(data.notes || 'New Note');
    const { getNode, setNodes } = useReactFlow();
    const textareaRef = useRef(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height
            const newHeight = textarea.scrollHeight;
            textarea.style.height = `${newHeight}px`; // Set to content height
            setNodes(nds => nds.map(node =>
                node.id === id ? { ...node, height: newHeight + 30 } : node // +30 for padding/handles
            ));
        }
    }, [notes, id, setNodes]);

    const updateNode = async () => {
        const node = getNode(id);
        const currentX = node?.position?.x ?? data.x;
        const currentY = node?.position?.y ?? data.y;
        console.log('Updating NoteNode:', { id, notes, x: currentX, y: currentY });
        onNodeDataChange(id, { notes });
        try {
            const response = await fetch(`http://localhost:3000/api/nodes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ x: currentX, y: currentY, type: 'note', notes })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log('NoteNode saved successfully');
        } catch (err) {
            console.error('Error updating note:', err);
            alert('Failed to save note—check console for details');
        }
    };

    return (
        <div className="note-node">
            <Handle type="target" position={Position.Left} className="handle" />
            <textarea
                ref={textareaRef}
                className="note-textarea"
                value={notes}
                onChange={e => { console.log('Notes changed:', e.target.value); setNotes(e.target.value); }}
                onBlur={updateNode}
                placeholder="Enter note"
            />
            <Handle type="source" position={Position.Right} className="handle" />
        </div>
    );
};

export default NoteNode;