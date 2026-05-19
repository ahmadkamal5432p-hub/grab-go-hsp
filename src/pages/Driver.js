import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../App.css";

export default function Driver() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("dashboard");

  const driverName = localStorage.getItem("driver_name") || "Unknown Driver";
  const driverKey = localStorage.getItem("driver_key") || "";
  const driverId = localStorage.getItem("driver_id") || "";

  const [assignedOrders, setAssignedOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [banners, setBanners] = useState([]);

  const driverChatId = "admin_driver_" + driverKey;

  const fetchBanners = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_banners")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setBanners(data || []);
  }, []);

  const fetchAssignedOrders = useCallback(async () => {
    if (!driverName || driverName === "Unknown Driver") return;

    const { data, error } = await supabase
      .from("app_orders")
      .select("*")
      .eq("driver_name", driverName)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setAssignedOrders(data || []);
  }, [driverName]);

  const fetchMessages = useCallback(async () => {
    if (!driverKey) return;

    const { data, error } = await supabase
      .from("app_messages")
      .select("*")
      .eq("chat_id", driverChatId)
      .order("created_at", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setMessages(data || []);
  }, [driverChatId, driverKey]);

  useEffect(() => {
    if (!driverKey) {
      alert("Please login as driver first.");
      navigate("/");
      return;
    }

    fetchBanners();
    fetchAssignedOrders();
    fetchMessages();

    const autoRefreshOrders = setInterval(() => {
      fetchAssignedOrders();
    }, 2000);

    return () => clearInterval(autoRefreshOrders);
  }, [driverKey, fetchBanners, fetchAssignedOrders, fetchMessages, navigate]);

  useEffect(() => {
    if (!driverKey) return;

    const channel = supabase
      .channel("driver-live-chat-" + driverChatId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_messages",
          filter: `chat_id=eq.${driverChatId}`,
        },
        (payload) => {
          setMessages((oldMessages) => [...oldMessages, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [driverChatId, driverKey]);

  const makeDriverFree = async (orderId) => {
    const { error } = await supabase
      .from("app_orders")
      .update({
        status: "Completed",
      })
      .eq("id", orderId);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Order completed. You are now free for next order.");
    fetchAssignedOrders();
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const { error } = await supabase.from("app_messages").insert({
      chat_id: driverChatId,
      sender: driverName,
      message: message,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setMessage("");
  };

  const logout = async () => {
    localStorage.removeItem("app_role");
    localStorage.removeItem("driver_id");
    localStorage.removeItem("driver_name");
    localStorage.removeItem("driver_key");

    navigate("/");
  };

  const activeAssignedOrders = assignedOrders.filter(
    (order) => order.status === "Assigned"
  );

  const completedOrders = assignedOrders.filter(
    (order) => order.status === "Completed"
  );

  const BannerView = () => {
    if (banners.length > 0) {
      return (
        <div className="banner-box">
          <p>📢 {banners[0].title}</p>
          <img
            src={banners[0].image_url}
            alt={banners[0].title}
            style={{
              width: "100%",
              maxWidth: "600px",
              borderRadius: "18px",
              marginTop: "15px",
            }}
          />
        </div>
      );
    }

    return <div className="banner-box">🚚 Welcome {driverName}</div>;
  };

  return (
    <div className="dashboard">
      <div className="sidebar">
        <h2 className="sidebar-logo">GRAB & GO HSP</h2>

        <ul>
          <li onClick={() => setActivePage("dashboard")}>Dashboard</li>
          <li onClick={() => setActivePage("orders")}>My Orders</li>
          <li onClick={() => setActivePage("messages")}>Chat with Admin</li>
          <li onClick={() => setActivePage("profile")}>Profile</li>
          <li onClick={logout}>Logout</li>
        </ul>
      </div>

      <div className="main-content">
        <div className="topbar">
          <h1>Driver Dashboard</h1>
        </div>

        {activePage === "dashboard" && (
          <>
            <BannerView />

            <div className="cards">
              <div className="card">
                <h2>{activeAssignedOrders.length}</h2>
                <p>Active Orders</p>
              </div>

              <div className="card">
                <h2>{completedOrders.length}</h2>
                <p>Completed Orders</p>
              </div>

              <div className="card">
                <h2>{activeAssignedOrders.length === 0 ? "Free" : "Busy"}</h2>
                <p>Driver Status</p>
              </div>
            </div>
          </>
        )}

        {activePage === "orders" && (
          <div className="admin-section">
            <h2>My Assigned Orders</h2>

            {assignedOrders.length === 0 && (
              <p style={{ color: "gray" }}>No assigned orders yet.</p>
            )}

            {assignedOrders.map((order) => (
              <div className="order-card" key={order.id}>
                <p>
                  <strong>Order ID:</strong> {order.id}
                </p>

                <p>
                  <strong>Customer:</strong> {order.customer_name}
                </p>

                <p>
                  <strong>Order Details:</strong> {order.item_details}
                </p>

                <p>
                  <strong>Address:</strong> {order.customer_address}
                </p>

                <p>
                  <strong>Phone:</strong> {order.phone_number}
                </p>

                <p>
                  <strong>Status:</strong> {order.status}
                </p>

                {order.status === "Assigned" && (
                  <button
                    className="accept-btn"
                    onClick={() => makeDriverFree(order.id)}
                  >
                    Free
                  </button>
                )}

                {order.status === "Completed" && (
                  <p style={{ color: "green", fontWeight: "bold" }}>
                    ✅ Completed — You are free for next order
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {activePage === "messages" && (
          <div className="admin-section">
            <h2>Chat with Admin</h2>

            <div className="chat-messages">
              {messages.length === 0 && (
                <p style={{ color: "gray" }}>No messages yet.</p>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.sender === driverName
                      ? "message driver-message"
                      : "message admin-message"
                  }
                >
                  <strong>{msg.sender}</strong>
                  <p>{msg.message}</p>
                </div>
              ))}
            </div>

            <div className="chat-input-area">
              <input
                className="chat-input"
                placeholder="Type message to admin..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />

              <button className="send-btn" onClick={sendMessage}>
                Send
              </button>
            </div>
          </div>
        )}

        {activePage === "profile" && (
          <div className="admin-section">
            <h2>Driver Profile</h2>

            <div className="order-card">
              <p>
                <strong>Name:</strong> {driverName}
              </p>

              <p>
                <strong>Driver ID:</strong> {driverId}
              </p>

              <p>
                <strong>Role:</strong> Driver
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {activeAssignedOrders.length === 0 ? "Free" : "Busy"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}