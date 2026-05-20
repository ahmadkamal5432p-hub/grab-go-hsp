import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../App.css";

export default function Customer() {
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("home");

  const jazzCashNumber = "03214905051";
  const jazzCashName = "Saqlain Shakeer";

  const [orderSystemEnabled, setOrderSystemEnabled] = useState(true);

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  const [fullName, setFullName] = useState("");
  const [itemDetails, setItemDetails] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [order, setOrder] = useState(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const [banners, setBanners] = useState([]);

  const loadUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();

    if (data?.session?.user) {
      const user = data.session.user;

      setUserEmail(user.email || "");
      setUserName(user.user_metadata?.full_name || "Customer");

      if (user.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
    } else {
      setUserEmail("");
      setUserName("");
    }
  }, []);

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/customer`,
      },
    });
  };

  const fetchAppSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", "main")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setOrderSystemEnabled(data.order_system_enabled);
  }, []);

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

  const fetchLatestOrder = useCallback(async () => {
    if (!userEmail) return;

    const { data, error } = await supabase
      .from("app_orders")
      .select("*")
      .eq("customer_email", userEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      alert(error.message);
      return;
    }

    if (data && data.length > 0) {
      setOrder(data[0]);
    } else {
      setOrder(null);
    }
  }, [userEmail]);

  useEffect(() => {
    loadUser();
    fetchBanners();
    fetchAppSettings();
  }, [loadUser, fetchBanners, fetchAppSettings]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUser]);

  useEffect(() => {
    fetchAppSettings();

    const autoCheckSettings = setInterval(() => {
      fetchAppSettings();
    }, 2000);

    return () => clearInterval(autoCheckSettings);
  }, [fetchAppSettings]);

  useEffect(() => {
    if (!userEmail) return;

    fetchLatestOrder();

    const autoRefreshOrders = setInterval(() => {
      fetchLatestOrder();
    }, 2000);

    return () => clearInterval(autoRefreshOrders);
  }, [userEmail, fetchLatestOrder]);
    const placeOrder = async () => {
    const phoneRegex = /^\d{11}$/;

    if (!orderSystemEnabled) {
      alert("Orders are currently stopped by admin. Please try again later.");
      return;
    }

    if (!userEmail) {
      alert("Please login with Google before placing an order.");
      return;
    }

    if (!fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    if (!itemDetails.trim()) {
      alert("Please write what you want to order.");
      return;
    }

    if (!address.trim()) {
      alert("Please write your full address.");
      return;
    }

    if (!phoneRegex.test(phoneNumber)) {
      alert("Phone number must be exactly 11 digits.");
      return;
    }

    const newOrderId = "GGHSP" + Math.floor(Math.random() * 100000);

    const { data, error } = await supabase
      .from("app_orders")
      .insert({
        id: newOrderId,
        customer_name: fullName,
        customer_email: userEmail,
        item_details: itemDetails,
        customer_address: address,
        phone_number: phoneNumber,
        driver_name: "Not Assigned",
        status: "Pending",
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setOrder(data);

    setItemDetails("");
    setAddress("");
    setPhoneNumber("");

    alert("Order placed successfully. Please wait for admin to accept it.");
    setActivePage("orders");
  };

  const canChat = order?.status === "Accepted" || order?.status === "Assigned";

  const getChatId = useCallback(() => {
    if (!order) return "";

    return (
      "customer_admin_" +
      order.customer_name.toLowerCase().replaceAll(" ", "_")
    );
  }, [order]);

  const fetchMessages = useCallback(async () => {
    if (!order) return;

    const chatId = getChatId();

    const { data, error } = await supabase
      .from("app_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setMessages(data || []);
  }, [order, getChatId]);

  useEffect(() => {
    if (!order) return;

    fetchMessages();

    const chatId = getChatId();

    const channel = supabase
      .channel("customer-live-chat-" + chatId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((oldMessages) => [...oldMessages, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [order, fetchMessages, getChatId]);

  const sendMessage = async () => {
    if (!canChat) {
      alert("You can chat with admin only after admin accepts your order.");
      return;
    }

    if (!message.trim()) return;

    const chatId = getChatId();

    const { error } = await supabase.from("app_messages").insert({
      chat_id: chatId,
      sender: "Customer",
      message: message,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setMessage("");
  };

  const copyJazzCashNumber = () => {
    navigator.clipboard.writeText(jazzCashNumber);
    alert("JazzCash number copied.");
  };

  const logout = async () => {
    await supabase.auth.signOut();

    setUserEmail("");
    setUserName("");
    setOrder(null);
    setMessages([]);

    navigate("/");
  };

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

    return <div className="banner-box">🎉 Welcome to GRAB & GO HSP</div>;
  };
    return (
    <div className="dashboard">
      <div className="sidebar">
        <h2 className="sidebar-logo">GRAB & GO HSP</h2>

        <ul>
          <li onClick={() => setActivePage("home")}>Home</li>
          <li onClick={() => setActivePage("placeOrder")}>Place Order</li>
          <li onClick={() => setActivePage("orders")}>My Order</li>
          <li onClick={() => setActivePage("track")}>Track Order</li>
          <li onClick={() => setActivePage("messages")}>Messages</li>
          <li onClick={() => setActivePage("profile")}>Profile</li>
          <li onClick={logout}>Logout</li>
        </ul>
      </div>

      <div className="main-content">
        <div className="topbar">
          <h1>Customer Dashboard</h1>
        </div>

        {activePage === "home" && (
          <>
            <BannerView />

            <div className="cards">
              <div className="card">
                <h2>{order ? "1" : "0"}</h2>
                <p>Active Order</p>
              </div>

              <div className="card">
                <h2>{order ? order.status : "No Order"}</h2>
                <p>Order Status</p>
              </div>

              <div className="card">
                <h2>{canChat ? "Open" : "Locked"}</h2>
                <p>Admin Chat</p>
              </div>
            </div>

            <div className="payment-box">
              <h2>JazzCash Payment</h2>
              <p>Please send payment to this JazzCash account:</p>

              <div className="payment-number">{jazzCashNumber}</div>

              <p>
                <strong>Account Name:</strong> {jazzCashName}
              </p>

              <button className="accept-btn" onClick={copyJazzCashNumber}>
                Copy JazzCash Number
              </button>
            </div>
          </>
        )}

        {activePage === "placeOrder" && (
          <div className="admin-section">
            <h2>Place New Order</h2>

            {!orderSystemEnabled && (
              <div className="locked-chat">
                ⛔ Orders are currently stopped by admin. Please try again later.
              </div>
            )}

            {!userEmail && (
              <p style={{ color: "red", fontWeight: "bold" }}>
                Please login with Google before placing an order.
              </p>
            )}

            {!userEmail && (
              <button className="accept-btn" onClick={loginWithGoogle}>
                Login with Google
              </button>
            )}

            <input
              className="input"
              placeholder="Your full name"
              value={fullName}
              disabled={!orderSystemEnabled}
              onChange={(e) => setFullName(e.target.value)}
            />

            <textarea
              className="input textarea"
              placeholder="What do you want to order? Write full details here..."
              value={itemDetails}
              disabled={!orderSystemEnabled}
              onChange={(e) => setItemDetails(e.target.value)}
            />

            <textarea
              className="input textarea"
              placeholder="Write your full address in one message..."
              value={address}
              disabled={!orderSystemEnabled}
              onChange={(e) => setAddress(e.target.value)}
            />

            <input
              className="input"
              placeholder="Your phone number - 11 digits"
              value={phoneNumber}
              maxLength="11"
              disabled={!orderSystemEnabled}
              onChange={(e) => {
                const onlyNumbers = e.target.value.replace(/\D/g, "");
                setPhoneNumber(onlyNumbers);
              }}
            />

            <button
              className="accept-btn"
              onClick={placeOrder}
              disabled={!orderSystemEnabled}
            >
              Submit Order
            </button>
          </div>
        )}

        {activePage === "orders" && (
          <div className="admin-section">
            <h2>My Order</h2>

            {!order && (
              <p style={{ color: "gray" }}>
                You have not placed any order yet.
              </p>
            )}

            {order && (
              <div className="order-card">
                <p>
                  <strong>Order ID:</strong> {order.id}
                </p>

                <p>
                  <strong>Name:</strong> {order.customer_name}
                </p>

                <p>
                  <strong>Email:</strong> {order.customer_email}
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
                  <strong>Driver:</strong> {order.driver_name}
                </p>

                <p>
                  <strong>Status:</strong> {order.status}
                </p>
              </div>
            )}
          </div>
        )}
                {activePage === "track" && (
          <div className="admin-section">
            <h2>Track Order</h2>

            {!order && <p style={{ color: "gray" }}>No active order found.</p>}

            {order && (
              <div className="order-card">
                <p>
                  <strong>Order:</strong> {order.id}
                </p>

                <p>
                  <strong>Status:</strong> {order.status}
                </p>

                <p>
                  <strong>Driver:</strong> {order.driver_name}
                </p>

                <p>
                  <strong>Location:</strong> Waiting for update
                </p>
              </div>
            )}
          </div>
        )}

        {activePage === "messages" && (
          <div className="admin-section">
            <h2>Chat with Admin</h2>

            {!canChat && (
              <div className="locked-chat">
                🔒 Chat locked. Admin must accept your order first.
              </div>
            )}

            {canChat && (
              <>
                <div className="chat-messages">
                  {messages.length === 0 && (
                    <p style={{ color: "gray" }}>No messages yet.</p>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={
                        msg.sender === "Customer"
                          ? "message customer-message"
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
              </>
            )}
          </div>
        )}

        {activePage === "profile" && (
          <div className="admin-section">
            <h2>Customer Profile</h2>

            <div className="order-card">
              <p>
                <strong>Name:</strong> {userName || "Not logged in"}
              </p>

              <p>
                <strong>Email:</strong> {userEmail || "Not logged in"}
              </p>

              <p>
                <strong>Role:</strong> Customer
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {userEmail ? "Logged in" : "Not logged in"}
              </p>

              {!userEmail && (
                <button className="accept-btn" onClick={loginWithGoogle}>
                  Login with Google
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}