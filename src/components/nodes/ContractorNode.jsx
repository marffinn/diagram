import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import './ContractorNode.css';

const ContractorNode = ({ id, data, onNodeDataChange }) => {
    const [contractorName, setContractorName] = useState(data.contractor_name || 'New Contractor');
    const [services, setServices] = useState(data.services || '');
    const [emails, setEmails] = useState(data.emails || []);
    const [numbers, setNumbers] = useState(data.numbers || []);
    const [priceSuggested, setPriceSuggested] = useState(data.price_suggested || '');
    const createdAt = data.created_at || Date.now();
    const [collapsed, setCollapsed] = useState(false); // New state for collapse

    const updateNode = async () => {
        const newData = {
            contractor_name: contractorName,
            services,
            emails,
            numbers,
            price_suggested: priceSuggested,
            created_at: createdAt
        };
        console.log('Updating ContractorNode:', { id, ...newData });
        onNodeDataChange(id, newData);
        try {
            const response = await fetch(`http://localhost:3000/api/nodes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ x: data.x, y: data.y, type: 'contractor', ...newData })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            console.log('ContractorNode saved successfully');
        } catch (err) {
            console.error('Error updating contractor:', err);
            alert('Failed to save contractor—check console');
        }
    };

    const toggleCollapse = () => {
        setCollapsed(!collapsed);
    };

    const formatTime = (timestamp) => new Date(parseInt(timestamp)).toLocaleString();

    return (
        <div className={`contractor-node ${collapsed ? 'collapsed' : ''}`}>
            <Handle type="target" position={Position.Left} className="handle" />
            <div className="input-container">
                <input
                    className="input-field contractor-name"
                    value={contractorName}
                    onChange={e => setContractorName(e.target.value)}
                    onBlur={updateNode}
                    placeholder="Contractor Name"
                />
            </div>
            {!collapsed && (
                <>
                    <div className="input-container">
                        <label className="input-label">Services</label>
                        <textarea
                            className="textarea-field"
                            value={services}
                            onChange={e => setServices(e.target.value)}
                            onBlur={updateNode}
                            placeholder="Services offered"
                        />
                    </div>
                    <div className="input-container">
                        <label className="input-label">Emails</label>
                        {emails.map((email, i) => (
                            <input
                                key={i}
                                className="input-field"
                                value={email}
                                onChange={e => setEmails(emails.map((em, j) => i === j ? e.target.value : em))}
                                onBlur={updateNode}
                                placeholder="Email"
                            />
                        ))}
                        <button className="add-button" onClick={() => setEmails([...emails, ''])}>+ Add Email</button>
                    </div>
                    <div className="input-container">
                        <label className="input-label">Phone Numbers</label>
                        {numbers.map((number, i) => (
                            <input
                                key={i}
                                className="input-field"
                                value={number}
                                onChange={e => setNumbers(numbers.map((num, j) => i === j ? e.target.value : num))}
                                onBlur={updateNode}
                                placeholder="Phone"
                            />
                        ))}
                        <button className="add-button" onClick={() => setNumbers([...numbers, ''])}>+ Add Phone</button>
                    </div>
                    <div className="input-container">
                        <input
                            className="input-field"
                            value={priceSuggested}
                            onChange={e => setPriceSuggested(e.target.value)}
                            onBlur={updateNode}
                            placeholder="Suggested Price"
                        />
                    </div>
                    <div className="creation-time">Created: {formatTime(createdAt)}</div>
                </>
            )}
            <button className="toggle-button" onClick={toggleCollapse}>
                {collapsed ? 'Expand' : 'Collapse'}
            </button>
            <Handle type="source" position={Position.Right} className="handle" />
        </div>
    );
};

export default ContractorNode;