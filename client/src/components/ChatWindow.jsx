import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';

const ChatWindow = ({ socket, sosId, userName, role }) => {
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [isOpen, setIsOpen] = useState(true);
    const scrollRef = useRef();

    useEffect(() => {
        if (sosId) {
           
            setMessages([]); 
            socket.emit("join_room", sosId);
        }
        
       
        const handleMessage = (data) => {
            setMessages((prev) => [...prev, data]);
        };

        
        const handleHistory = (history) => {
            console.log("History loaded:", history); 
            setMessages(history);
        };

        socket.on("receive_message", handleMessage);
        socket.on("load_messages", handleHistory); 

        return () => {
            socket.off("receive_message", handleMessage);
            socket.off("load_messages", handleHistory);
        };
    }, [socket, sosId]);

    
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (currentMessage !== "") {
            const messageData = {
                room: sosId,
                author: userName || role,
                message: currentMessage,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                role: role 
            };

            await socket.emit("send_message", messageData);
        
            setMessages((prev) => [...prev, messageData]);
            setCurrentMessage("");
        }
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition animate-bounce">
                <MessageSquare size={24}/>
            </button>
        );
    }

    return (
        <div className="w-80 h-96 bg-white rounded-xl shadow-2xl flex flex-col border border-gray-300 overflow-hidden font-sans z-[9999]">
            <div className="bg-blue-600 p-3 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <MessageSquare size={18}/> 
                    <span className="font-bold">Mission Chat</span>
                </div>
                <button onClick={() => setIsOpen(false)}><X size={18}/></button>
            </div>
            
            <div className="flex-1 p-3 overflow-y-auto bg-gray-50">
                {messages.length === 0 && <p className="text-xs text-gray-400 text-center mt-4">No messages yet. Start the conversation.</p>}
                
                {messages.map((msg, index) => (
                    <div key={index} className={`flex flex-col mb-2 ${msg.role === role ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3 py-2 rounded-lg text-sm max-w-[80%] shadow-sm ${msg.role === role ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-black border border-gray-200 rounded-bl-none'}`}>
                            <p className="text-inherit break-words">{msg.message}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1">{msg.time} • {msg.author}</span>
                    </div>
                ))}
                <div ref={scrollRef} />
            </div>

            <div className="p-2 border-t bg-white flex gap-2">
                <input 
                    type="text" 
                    value={currentMessage} 
                    onChange={(e) => setCurrentMessage(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..." 
                    className="flex-1 border rounded-lg px-3 py-2 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={sendMessage} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 shadow-md"><Send size={18}/></button>
            </div>
        </div>
    );
};

export default ChatWindow;