// src/components/nodes/CustomerNode.jsx
import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import './CustomerNode.css';

const CustomerNode = ({ id, data, onNodeDataChange }) => {
    const [clientName, setClientName] = useState(data.client_name || 'New Customer');
    const [clientEmails, setClientEmails] = useState(data.client_emails || []);
    const [clientPhones, setClientPhones] = useState(data.client_phones || []);
    const [clientNote, setClientNote] = useState(data.client_note || '');

    const updateNode = async () => {
        if (typeof onNodeDataChange === 'function') { // Ensure it’s a function
            onNodeDataChange(id, { client_name: clientName, client_emails: clientEmails, client_phones: clientPhones, client_note: clientNote });
        } else {
            console.error('onNodeDataChange is not a function');
        }
        try {
            const response = await fetch(`http://localhost:3000/api/nodes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    x: data.x,
                    y: data.y,
                    type: 'customer',
                    client_name: clientName,
                    client_emails: clientEmails,
                    client_phones: clientPhones,
                    client_note: clientNote
                })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            console.log('CustomerNode saved successfully');
        } catch (err) {
            console.error('Error updating customer:', err);
        }
    };

    return (
        <div className="customer-node">
            <Handle type="target" position={Position.Left} className="handle" />
            <div className="input-container">
                <input
                    className="input-field"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    onBlur={updateNode}
                    placeholder="Client Name"
                />
            </div>
            <div className="input-container">
                <label className="input-label">Emails</label>
                {clientEmails.map((email, i) => (
                    <input
                        key={i}
                        className="input-field"
                        value={email}
                        onChange={e => setClientEmails(clientEmails.map((em, j) => i === j ? e.target.value : em))}
                        onBlur={updateNode}
                        placeholder="Email"
                    />
                ))}
                <button className="add-button" onClick={() => setClientEmails([...clientEmails, ''])}>+ Add Email</button>
            </div>
            <div className="input-container">
                <label className="input-label">Phone Numbers</label>
                {clientPhones.map((phone, i) => (
                    <input
                        key={i}
                        className="input-field"
                        value={phone}
                        onChange={e => setClientPhones(clientPhones.map((ph, j) => i === j ? e.target.value : ph))}
                        onBlur={updateNode}
                        placeholder="Phone"
                    />
                ))}
                <button className="add-button" onClick={() => setClientPhones([...clientPhones, ''])}>+ Add Phone</button>
            </div>
            <div className="input-container">
                <textarea
                    className="textarea-field"
                    value={clientNote}
                    onChange={e => setClientNote(e.target.value)}
                    onBlur={updateNode}
                    placeholder="Note"
                />
            </div>
            <Handle type="source" position={Position.Right} className="handle" />
        </div>
    );
};

export default CustomerNode;