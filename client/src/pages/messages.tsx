import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppHeader } from "@/components/map/app-header";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageSquare, 
  Send, 
  ArrowLeft,
  Users
} from "lucide-react";
import type { Conversation, Message, User } from "@shared/schema";

export default function Messages() {
  const { conversationId } = useParams();
  const { user: currentUser } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    enabled: !!conversationId,
  });

  // Fetch user details for conversations
  const { data: users = {} } = useQuery<Record<string, User>>({
    queryKey: ['/api/users/batch', conversations.map(c => `${c.user1Id}-${c.user2Id}`).join(',')],
    queryFn: async () => {
      const userIds = Array.from(new Set(
        conversations.flatMap(conv => [conv.user1Id, conv.user2Id])
          .filter(id => id !== currentUser?.id)
      ));
      
      const userMap: Record<string, User> = {};
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const response = await fetch(`/api/users/${userId}`, {
              credentials: 'include'
            });
            if (response.ok) {
              const user = await response.json();
              userMap[userId] = user;
            }
          } catch (error) {
            console.error(`Failed to fetch user ${userId}:`, error);
          }
        })
      );
      return userMap;
    },
    enabled: conversations.length > 0,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      await sendMessageMutation.mutateAsync(newMessage.trim());
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getOtherUser = (conversation: Conversation): User | undefined => {
    const otherUserId = conversation.user1Id === currentUser?.id 
      ? conversation.user2Id 
      : conversation.user1Id;
    return users[otherUserId];
  };

  const selectedConversation = conversations.find(c => c.id === conversationId);

  if (conversationsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader onMenuToggle={() => {}} />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">Loading conversations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onMenuToggle={() => {}} />
      
      <div className="container mx-auto px-4 pt-20 pb-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Conversations List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="flex-shrink-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea style={{ height: 'calc(100vh - 240px)' }}>
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start messaging other users!</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conversation) => {
                      const otherUser = getOtherUser(conversation);
                      const isActive = conversation.id === conversationId;
                      
                      return (
                        <Button
                          key={conversation.id}
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start p-3 h-auto"
                          onClick={() => {
                            setLocation(`/messages/${conversation.id}`);
                          }}
                          data-testid={`conversation-${conversation.id}`}
                        >
                          <div 
                            className="flex items-center cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (otherUser?.id) {
                                setLocation(`/users/${otherUser.id}`);
                              }
                            }}
                            data-testid={`profile-link-${otherUser?.id}`}
                          >
                            <Avatar className="w-10 h-10 mr-3">
                              <AvatarImage 
                                src={otherUser?.profileImageUrl || undefined} 
                                alt={otherUser?.firstName || 'User'} 
                              />
                              <AvatarFallback>
                                {otherUser?.firstName?.[0] || otherUser?.email?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-sm hover:underline">
                                {otherUser?.firstName && otherUser?.lastName 
                                  ? `${otherUser.firstName} ${otherUser.lastName}`
                                  : otherUser?.email || 'Unknown User'
                                }
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {conversation.lastMessageAt 
                                  ? new Date(conversation.lastMessageAt).toLocaleDateString()
                                  : 'No messages yet'
                                }
                              </div>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {conversationId && selectedConversation ? (
              <>
                <CardHeader className="flex-shrink-0 pb-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLocation('/messages');
                      }}
                      className="lg:hidden"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => {
                        const otherUser = getOtherUser(selectedConversation);
                        if (otherUser?.id) {
                          setLocation(`/users/${otherUser.id}`);
                        }
                      }}
                      data-testid={`header-profile-link-${getOtherUser(selectedConversation)?.id}`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage 
                          src={getOtherUser(selectedConversation)?.profileImageUrl || undefined} 
                          alt="User" 
                        />
                        <AvatarFallback>
                          {getOtherUser(selectedConversation)?.firstName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg hover:underline">
                          {(() => {
                            const otherUser = getOtherUser(selectedConversation);
                            return otherUser?.firstName && otherUser?.lastName 
                              ? `${otherUser.firstName} ${otherUser.lastName}`
                              : otherUser?.email || 'Unknown User';
                          })()}
                        </CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 overflow-hidden p-4" style={{ height: 'calc(100vh - 240px)' }}>
                  {/* Messages */}
                  <ScrollArea className="flex-1 mb-4">
                    {messagesLoading ? (
                      <div className="text-center py-4">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                      </div>
                    ) : (
                      <div className="space-y-4 p-2">
                        {messages.slice().reverse().map((message) => {
                          const isOwn = message.senderId === currentUser?.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                              data-testid={`message-${message.id}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ''}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      disabled={sendMessageMutation.isPending}
                      data-testid="input-new-message"
                    />
                    <Button 
                      type="submit" 
                      disabled={sendMessageMutation.isPending || !newMessage.trim()}
                      data-testid="button-send"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center flex-1">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a conversation to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}