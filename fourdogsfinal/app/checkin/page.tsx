useEffect(() => {
  async function loadEvents() {
    const { data, error } = await supabase
      .from("events")
      .select(`
        id,
        title,
        event_date,
        status,
        venues(name)
      `)
      .eq("status", "live");

    if (error) {
      console.error("Supabase error:", error);
      setErrorMsg(error.message);
      setPageState("no-event");
      return;
    }

    if (!data || data.length === 0) {
      setPageState("no-event");
      return;
    }

    const available = (data as any[]).map((e) => ({
      id: e.id,
      title: e.title,
      event_date: e.event_date,
      status: e.status,
      venue_name: e.venues?.name || "Unknown Venue",
    }));

    setEvents(available);

    if (available.length === 1) {
      setSelectedEvent(available[0]);
      setPageState("form");
    } else {
      setPageState("select-event");
    }
  }

  loadEvents();
}, []);
