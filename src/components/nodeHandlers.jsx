// src/components/nodeHandlers.jsx
import UserNode from './nodes/UserNode';
import CustomerNode from './nodes/CustomerNode';
import NoteNode from './nodes/NoteNode';
import SmsNode from './nodes/SmsNode';
import TimerNode from './nodes/TimerNode';
import ContractorNode from './nodes/ContractorNode';

export const onNodeDataChange = (setNodes) => (nodeId, newData) => {
    setNodes(nds => nds.map(node => node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node));
};

export const nodeTypes = {
    user: UserNode,
    customer: CustomerNode,
    note: NoteNode,
    sms: SmsNode,
    timer: TimerNode,
    contractor: ContractorNode
};

export const changeNodeType = (setNodes, edges, nodes, setContextMenu) => (newType) => {
    const apiCall = (method, url, body) => fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
    }).then(res => res.json()).catch(err => console.error(`Error in ${method} ${url}:`, err));

    return () => {
        const parentNode = nodes.find(n => n.id === setContextMenu.nodeId);
        const hasSmsNode = edges.some(e => e.source === parentNode.id && nodes.find(n => n.id === e.target)?.type === 'sms');
        if (newType === 'sms' && hasSmsNode) {
            alert('Parent already has an SmsNode—cannot change to another!');
            setContextMenu(null);
            return;
        }

        setNodes(nds => nds.map(node => node.id === setContextMenu.nodeId ? {
            ...node,
            type: newType,
            data: {
                ...(newType === 'timer' && { created_at: Date.now() }),
                ...(newType === 'customer' && { client_name: 'New Customer', client_emails: [], client_phones: [], client_note: '' }),
                ...(newType === 'note' && { notes: 'New Note' }),
                ...(newType === 'sms' && { messages: [] }),
                ...(newType === 'contractor' && {
                    contractor_name: 'New Contractor',
                    services: '',
                    emails: [],
                    numbers: [],
                    price_suggested: '',
                    created_at: Date.now()
                })
            }
        } : node));
        apiCall('PUT', `http://localhost:3000/api/nodes/${setContextMenu.nodeId}`, {
            type: newType,
            x: parentNode.position.x,
            y: parentNode.position.y,
            ...(newType === 'timer' && { created_at: Date.now() }),
            ...(newType === 'customer' && { client_name: 'New Customer', client_emails: [], client_phones: [], client_note: '' }),
            ...(newType === 'note' && { notes: 'New Note' }),
            ...(newType === 'sms' && { messages: [] }),
            ...(newType === 'contractor' && {
                contractor_name: 'New Contractor',
                services: '',
                emails: [],
                numbers: [],
                price_suggested: '',
                created_at: Date.now()
            })
        });
        setContextMenu(null);
    };
};

// No change here—just removing SMS restriction
export const deleteNode = (setNodes, edges, setContextMenu, contextMenu) => () => {
    const apiCall = (method, url) => fetch(url, { method, credentials: 'include' })
        .then(res => res.json())
        .catch(err => console.error(`Error in ${method} ${url}:`, err));

    if (contextMenu.nodeType === 'user') {
        alert('Cannot delete the User Node!');
        setContextMenu(null);
        return;
    }
    apiCall('DELETE', `http://localhost:3000/api/nodes/${contextMenu.nodeId}`);
    setNodes(nds => nds.filter(node => node.id !== contextMenu.nodeId));
    setEdges(eds => eds.filter(edge => edge.source !== contextMenu.nodeId && edge.target !== contextMenu.nodeId));
    setContextMenu(null);
};

export const disconnectEdges = (setEdges, contextMenu) => () => {
    setEdges(eds => eds.filter(edge => edge.source !== contextMenu.nodeId && edge.target !== contextMenu.nodeId));
};