import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "../App.css";

const makeCustomerChatId = (name) => {
  return "customer_admin_" + name.toLowerCase().replaceAll(" ", "_");
};

const makeDriverChatId = (driverKey) => {
  return "admin_driver_" + driverKey;
};

export default function Admin() {
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("dashboard");

  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [orderSystemEnabled, setOrderSystemEnabled] = useState(true);

  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverId, setNewDriverId] = useState("");
  const [newDriverPin, setNewDriverPin] = useState("");

  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [banners, setBanners] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customerMessageText, setCustomerMessageText] = useState("");
  const [customerMessages, setCustomerMessages] = useState([]);

  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverMessageText, setDriverMessageText] = useState("");
  const [driverMessages, setDriverMessages] = useState([]);

  const customerNames = [
    ...new Set(orders.map((order) => order.customer_name).filter(Boolean)),
  ];

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

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setOrders(data || []);

    if (data && data.length > 0) {
      setSelectedCustomer((oldCustomer) => oldCustomer || data[0].customer_name);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_drivers")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setDrivers(data || []);

    if (data && data.length > 0) {
      setSelectedDriver((oldDriver) => oldDriver || data[0]);
    }
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

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    fetchAppSettings();
    fetchBanners();

    const autoRefresh = setInterval(() => {
      fetchOrders();
      fetchDrivers();
      fetchAppSettings();
    }, 2000);

    return () => clearInterval(autoRefresh);
  }, [fetchOrders, fetchDrivers, fetchAppSettings, fetchBanners]);

  const toggleOrderSystem = async () => {
    const newValue = !orderSystemEnabled;

    const { error } = await supabase
      .from("app_settings")
      .update({
        order_system_enabled: newValue,
        updated_at: new Date(),
      })
      .eq("id", "main");

    if (error) {
      alert(error.message);
      return;
    }

    setOrderSystemEnabled(newValue);
    alert(newValue ? "Order system started." : "Order system stopped.");
  };

  const createDriver = async () => {
    if (!newDriverName.trim()) {
      alert("Enter driver name.");
      return;
    }

    if (!newDriverId.trim()) {
      alert("Enter driver ID.");
      return;
    }

    if (!newDriverPin.trim()) {
      alert("Enter driver PIN.");
      return;
    }

    const { data, error } = await supabase.rpc("create_driver_secure", {
      p_driver_name: newDriverName.trim(),
      p_driver_id: newDriverId.trim(),
      p_pin: newDriverPin.trim(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    const result = data?.[0];

    if (!result?.success) {
      alert(result?.message || "Could not create driver.");
      return;
    }

    setNewDriverName("");
    setNewDriverId("");
    setNewDriverPin("");

    fetchDrivers();
    alert("Driver created successfully.");
  };

  const deleteDriver = async (driverId, driverName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${driverName}?`
    );

    if (!confirmDelete) return;

    const { data, error } = await supabase.rpc("delete_driver_secure", {
      p_driver_uuid: driverId,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const result = data?.[0];

    if (!result?.success) {
      alert(result?.message || "Could not delete driver.");
      return;
    }

    if (selectedDriver?.id === driverId) {
      setSelectedDriver(null);
      setDriverMessages([]);
    }

    fetchDrivers();
    alert("Driver deleted successfully.");
  };
  const acceptOrder = async (orderId) => {
    const { error } = await supabase
      .from("app_orders")
      .update({
        status: "Accepted",
        driver_name: "Not Assigned",
      })
      .eq("id", orderId);

    if (error) {
      alert(error.message);
      return;
    }

    fetchOrders();
    alert("Order accepted. Now assign a free driver.");
  };

  const getFreeDrivers = () => {
    return drivers.filter((driver) => {
      const isBusy = orders.some(
        (order) =>
          order.driver_name === driver.driver_name &&
          order.status === "Assigned"
      );

      return !isBusy;
    });
  };

  const assignDriver = async (orderId, driverName) => {
    const { error } = await supabase
      .from("app_orders")
      .update({
        driver_name: driverName,
        status: "Assigned",
      })
      .eq("id", orderId);

    if (error) {
      alert(error.message);
      return;
    }

    fetchOrders();
    alert(`Order assigned to ${driverName}`);
  };

  const fetchCustomerMessages = useCallback(async (customerName) => {
    if (!customerName) return;

    const chatId = makeCustomerChatId(customerName);

    const { data, error } = await supabase
      .from("app_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setCustomerMessages(data || []);
  }, []);

  const fetchDriverMessages = useCallback(async (driver) => {
    if (!driver) return;

    const chatId = makeDriverChatId(driver.driver_key);

    const { data, error } = await supabase
      .from("app_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setDriverMessages(data || []);
  }, []);

  useEffect(() => {
    if (!selectedCustomer) return;

    const chatId = makeCustomerChatId(selectedCustomer);

    fetchCustomerMessages(selectedCustomer);

    const channel = supabase
      .channel("admin-customer-live-" + chatId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setCustomerMessages((oldMessages) => [...oldMessages, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCustomer, fetchCustomerMessages]);

  useEffect(() => {
    if (!selectedDriver) return;

    const chatId = makeDriverChatId(selectedDriver.driver_key);

    fetchDriverMessages(selectedDriver);

    const channel = supabase
      .channel("admin-driver-live-" + chatId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setDriverMessages((oldMessages) => [...oldMessages, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDriver, fetchDriverMessages]);

  const selectCustomerChat = (name) => {
    setSelectedCustomer(name);
    setActivePage("customerMessages");
  };

  const sendCustomerMessage = async () => {
    if (!selectedCustomer) {
      alert("Please select a customer first.");
      return;
    }

    if (!customerMessageText.trim()) return;

    const chatId = makeCustomerChatId(selectedCustomer);

    const { error } = await supabase.from("app_messages").insert({
      chat_id: chatId,
      sender: "Admin",
      message: customerMessageText,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setCustomerMessageText("");
  };

  const selectDriverChat = (driver) => {
    setSelectedDriver(driver);
    setActivePage("driverMessages");
  };

  const sendDriverMessage = async () => {
    if (!selectedDriver) {
      alert("Please select driver first.");
      return;
    }

    if (!driverMessageText.trim()) return;

    const chatId = makeDriverChatId(selectedDriver.driver_key);

    const { error } = await supabase.from("app_messages").insert({
      chat_id: chatId,
      sender: "Admin",
      message: driverMessageText,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setDriverMessageText("");
  };
    const uploadBanner = async () => {
    if (!bannerFile) {
      alert("Please select an image first.");
      return;
    }

    const fileName = `${Date.now()}-${bannerFile.name}`;

    const { error: uploadError } = await supabase.storage
      .from("banners")
      .upload(fileName, bannerFile);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("banners").getPublicUrl(fileName);

    const { error: dbError } = await supabase.from("app_banners").insert({
      title: bannerTitle || "GRAB & GO HSP Banner",
      image_url: data.publicUrl,
      is_active: true,
    });

    if (dbError) {
      alert(dbError.message);
      return;
    }

    setBannerTitle("");
    setBannerFile(null);

    fetchBanners();
    alert("Banner uploaded successfully.");
  };

  const deleteBanner = async (bannerId) => {
    const { error } = await supabase
      .from("app_banners")
      .update({ is_active: false })
      .eq("id", bannerId);

    if (error) {
      alert(error.message);
      return;
    }

    fetchBanners();
    alert("Banner removed.");
  };

  const logout = async () => {
    localStorage.removeItem("app_role");
    localStorage.removeItem("admin_id");

    await supabase.auth.signOut();
    navigate("/");
  };

  const freeDrivers = getFreeDrivers();

  return (
    <div className="dashboard">
      <div className="sidebar">
        <h2 className="sidebar-logo">GRAB & GO HSP</h2>

        <ul>
          <li onClick={() => setActivePage("dashboard")}>Dashboard</li>
          <li onClick={() => setActivePage("orders")}>Orders</li>
          <li onClick={() => setActivePage("drivers")}>Drivers</li>
          <li onClick={() => setActivePage("customers")}>Customers</li>
          <li onClick={() => setActivePage("banners")}>Banner Ads</li>
          <li onClick={() => setActivePage("appControl")}>App Control</li>
          <li onClick={() => setActivePage("customerMessages")}>
            Customer Messages
          </li>
          <li onClick={() => setActivePage("driverMessages")}>
            Driver Messages
          </li>
          <li onClick={logout}>Logout</li>
        </ul>
      </div>

      <div className="main-content">
        <div className="topbar">
          <h1>Admin Dashboard</h1>
        </div>

        {activePage === "dashboard" && (
          <>
            {banners.length > 0 ? (
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
            ) : (
              <div className="banner-box">📢 No banner uploaded yet</div>
            )}

            <div className="cards">
              <div className="card">
                <h2>{orders.length}</h2>
                <p>Total Orders</p>
              </div>

              <div className="card">
                <h2>{drivers.length}</h2>
                <p>Total Drivers</p>
              </div>

              <div className="card">
                <h2>{freeDrivers.length}</h2>
                <p>Free Drivers</p>
              </div>

              <div className="card">
                <h2>
                  {orders.filter((order) => order.status === "Pending").length}
                </h2>
                <p>Pending Orders</p>
              </div>
            </div>
          </>
        )}

        {activePage === "appControl" && (
          <div className="admin-section">
            <h2>App Control</h2>

            <div className="order-card">
              <p>
                <strong>Order System:</strong>{" "}
                {orderSystemEnabled ? "Running ✅" : "Stopped ⛔"}
              </p>

              <p style={{ color: "gray" }}>
                When stopped, customers cannot place new orders.
              </p>

              <button className="accept-btn" onClick={toggleOrderSystem}>
                {orderSystemEnabled ? "Stop Orders" : "Start Orders"}
              </button>
            </div>
          </div>
        )}
                {activePage === "orders" && (
          <div className="admin-section">
            <h2>Customer Orders</h2>

            <button className="accept-btn" onClick={fetchOrders}>
              Refresh Orders
            </button>

            {orders.length === 0 && (
              <p style={{ color: "gray" }}>No orders yet.</p>
            )}

            {orders.map((order) => (
              <div className="order-card" key={order.id}>
                <p><strong>Order ID:</strong> {order.id}</p>
                <p><strong>Customer:</strong> {order.customer_name}</p>
                <p><strong>Email:</strong> {order.customer_email || "No email"}</p>
                <p><strong>Order Details:</strong> {order.item_details}</p>
                <p><strong>Address:</strong> {order.customer_address}</p>
                <p><strong>Phone:</strong> {order.phone_number}</p>
                <p><strong>Driver:</strong> {order.driver_name}</p>
                <p><strong>Status:</strong> {order.status}</p>

                {order.status === "Pending" && (
                  <button
                    className="accept-btn"
                    onClick={() => acceptOrder(order.id)}
                  >
                    Accept Order
                  </button>
                )}

                {order.status === "Accepted" && (
                  <div>
                    <p style={{ color: "green", fontWeight: "bold" }}>
                      ✅ Order accepted. Assign a free driver:
                    </p>

                    {freeDrivers.length === 0 && (
                      <p style={{ color: "red", fontWeight: "bold" }}>
                        No free drivers available.
                      </p>
                    )}

                    {freeDrivers.map((driver) => (
                      <button
                        key={driver.id}
                        className="accept-btn"
                        onClick={() =>
                          assignDriver(order.id, driver.driver_name)
                        }
                      >
                        Assign to {driver.driver_name}
                      </button>
                    ))}
                  </div>
                )}

                {order.status === "Assigned" && (
                  <p style={{ color: "blue", fontWeight: "bold" }}>
                    🚚 Assigned to {order.driver_name}
                  </p>
                )}

                {order.status === "Completed" && (
                  <p style={{ color: "green", fontWeight: "bold" }}>
                    ✅ Completed
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {activePage === "drivers" && (
          <div className="admin-section">
            <h2>Create Driver</h2>

            <input
              className="input"
              placeholder="Driver Name"
              value={newDriverName}
              onChange={(e) => setNewDriverName(e.target.value)}
            />

            <input
              className="input"
              placeholder="Driver ID e.g. DRIVER004"
              value={newDriverId}
              onChange={(e) => setNewDriverId(e.target.value)}
            />

            <input
              className="input"
              type="password"
              placeholder="Driver PIN e.g. 4444"
              value={newDriverPin}
              onChange={(e) => setNewDriverPin(e.target.value)}
            />

            <button className="accept-btn" onClick={createDriver}>
              Create Driver
            </button>

            <button className="accept-btn" onClick={fetchDrivers}>
              Refresh Drivers
            </button>

            <h2>All Drivers</h2>

            {drivers.length === 0 && (
              <p style={{ color: "gray" }}>No drivers created yet.</p>
            )}

            {drivers.map((driver) => {
              const busyOrder = orders.find(
                (order) =>
                  order.driver_name === driver.driver_name &&
                  order.status === "Assigned"
              );

              return (
                <div className="order-card" key={driver.id}>
                  <p>
                    🚚 <strong>{driver.driver_name}</strong>
                  </p>

                  <p>
                    <strong>Driver ID:</strong> {driver.driver_id}
                  </p>

                  <p>
                    <strong>PIN:</strong> Hidden for security
                  </p>

                  {busyOrder ? (
                    <p style={{ color: "red", fontWeight: "bold" }}>
                      Busy with order {busyOrder.id}
                    </p>
                  ) : (
                    <p style={{ color: "green", fontWeight: "bold" }}>
                      Free
                    </p>
                  )}

                  <button
                    className="accept-btn"
                    onClick={() => selectDriverChat(driver)}
                  >
                    Chat with {driver.driver_name}
                  </button>

                  <button
                    className="danger-btn"
                    onClick={() =>
                      deleteDriver(driver.id, driver.driver_name)
                    }
                  >
                    Delete Driver
                  </button>
                </div>
              );
            })}
          </div>
        )}
                {activePage === "customers" && (
          <div className="admin-section">
            <h2>Customers</h2>

            <button className="accept-btn" onClick={fetchOrders}>
              Refresh Customers
            </button>

            {customerNames.length === 0 && (
              <p style={{ color: "gray" }}>No customers found yet.</p>
            )}

            {customerNames.map((name) => (
              <div className="order-card" key={name}>
                👤 {name}
                <br />

                <button
                  className="accept-btn"
                  onClick={() => selectCustomerChat(name)}
                >
                  Chat with {name}
                </button>
              </div>
            ))}
          </div>
        )}

        {activePage === "banners" && (
          <div className="admin-section">
            <h2>Banner Ads</h2>

            <input
              className="input"
              placeholder="Banner title"
              value={bannerTitle}
              onChange={(e) => setBannerTitle(e.target.value)}
            />

            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setBannerFile(e.target.files[0])}
            />

            <button className="accept-btn" onClick={uploadBanner}>
              Upload Banner
            </button>

            <button className="accept-btn" onClick={fetchBanners}>
              Refresh Banners
            </button>

            <h2>Uploaded Banners</h2>

            {banners.length === 0 && (
              <p style={{ color: "gray" }}>No banners uploaded yet.</p>
            )}

            {banners.map((banner) => (
              <div className="order-card" key={banner.id}>
                <p>
                  <strong>{banner.title}</strong>
                </p>

                <img
                  src={banner.image_url}
                  alt={banner.title}
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    borderRadius: "18px",
                    marginTop: "10px",
                  }}
                />

                <br />

                <button
                  className="accept-btn"
                  onClick={() => deleteBanner(banner.id)}
                >
                  Remove Banner
                </button>
              </div>
            ))}
          </div>
        )}
                {activePage === "customerMessages" && (
          <div className="chat-layout">
            <div className="chat-users">
              <h2>Customers</h2>

              {customerNames.map((name) => (
                <div
                  key={name}
                  className={
                    selectedCustomer === name
                      ? "chat-user active-chat-user"
                      : "chat-user"
                  }
                  onClick={() => selectCustomerChat(name)}
                >
                  👤 {name}
                </div>
              ))}
            </div>

            <div className="chat-box">
              <h2>
                {selectedCustomer
                  ? `Chat with ${selectedCustomer}`
                  : "Select Customer"}
              </h2>

              <div className="chat-messages">
                {customerMessages.length === 0 && (
                  <p style={{ color: "gray" }}>No messages yet.</p>
                )}

                {customerMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.sender === "Admin"
                        ? "message admin-message"
                        : "message customer-message"
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
                  placeholder={
                    selectedCustomer
                      ? `Reply to ${selectedCustomer}...`
                      : "Select customer first..."
                  }
                  value={customerMessageText}
                  onChange={(e) => setCustomerMessageText(e.target.value)}
                />

                <button className="send-btn" onClick={sendCustomerMessage}>
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {activePage === "driverMessages" && (
          <div className="chat-layout">
            <div className="chat-users">
              <h2>Drivers</h2>

              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className={
                    selectedDriver?.id === driver.id
                      ? "chat-user active-chat-user"
                      : "chat-user"
                  }
                  onClick={() => selectDriverChat(driver)}
                >
                  🚚 {driver.driver_name}
                </div>
              ))}
            </div>

            <div className="chat-box">
              <h2>
                {selectedDriver
                  ? `Chat with ${selectedDriver.driver_name}`
                  : "Select Driver"}
              </h2>

              <div className="chat-messages">
                {driverMessages.length === 0 && (
                  <p style={{ color: "gray" }}>No messages yet.</p>
                )}

                {driverMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.sender === "Admin"
                        ? "message admin-message"
                        : "message driver-message"
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
                  placeholder={
                    selectedDriver
                      ? `Message ${selectedDriver.driver_name}...`
                      : "Select driver first..."
                  }
                  value={driverMessageText}
                  onChange={(e) => setDriverMessageText(e.target.value)}
                />

                <button className="send-btn" onClick={sendDriverMessage}>
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}