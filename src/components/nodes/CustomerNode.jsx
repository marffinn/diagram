import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import './CustomerNode.css';

const CustomerNode = ({ id, data, onNodeDataChange }) => {
    const [clientName, setClientName] = useState(data.client_name || 'New Customer');
    const [emails, setEmails] = useState(data.client_emails || []);
    const [phones, setPhones] = useState(data.client_phones || []);
    const [note, setNote] = useState(data.client_note || '');

    const updateNode = () => {
        const newData = { client_name: clientName, client_emails: emails, client_phones: phones, client_note: note };
        console.log('Updating CustomerNode:', { id, ...newData });
        onNodeDataChange(id, newData);
        fetch(`http://localhost:3000/api/nodes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ x: data.x, y: data.y, type: 'customer', ...newData })
        }).catch(err => console.error('Error updating customer:', err));
    };

    return (
        <div className="customer-node">
            <Handle type="target" position={Position.Left} className="handle" />
            <div className="input-container">
                <input
                    className="input-field"
                    value={clientName}
                    onChange={e => { console.log('Name changed:', e.target.value); setClientName(e.target.value); }}
                    onBlur={updateNode}
                    placeholder="Client Name"
                />
            </div>
            <div className="input-container">
                <label className="input-label">Emails</label>
                {emails.map((email, i) => (
                    <input
                        key={i}
                        className="input-field"
                        value={email}
                        onChange={e => { console.log('Email changed:', e.target.value); setEmails(emails.map((em, j) => i === j ? e.target.value : em)); }}
                        onBlur={updateNode}
                        placeholder="Email"
                    />
                ))}
                <button className="add-button" onClick={() => setEmails([...emails, ''])}>+ Add Email</button>
            </div>
            <div className="input-container">
                <label className="input-label">Phone Numbers</label>
                {phones.map((phone, i) => (
                    <input
                        key={i}
                        className="input-field"
                        value={phone}
                        onChange={e => { console.log('Phone changed:', e.target.value); setPhones(phones.map((ph, j) => i === j ? e.target.value : ph)); }}
                        onBlur={updateNode}
                        placeholder="Phone"
                    />
                ))}
                <button className="add-button" onClick={() => setPhones([...phones, ''])}>+ Add Phone</button>
            </div>
            <div>
                <label className="input-label">Client Needs</label>
                <textarea
                    className="textarea-field"
                    value={note}
                    onChange={e => { console.log('Note changed:', e.target.value); setNote(e.target.value); }}
                    onBlur={updateNode}
                    placeholder="What does the client need?"
                />
            </div>
            <Handle type="source" position={Position.Right} className="handle" />
        </div>
    );
};

export default CustomerNode;