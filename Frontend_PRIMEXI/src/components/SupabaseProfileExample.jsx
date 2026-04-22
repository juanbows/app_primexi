"use client";

import { useEffect, useState } from "react";
import { getProfile } from "@/lib/data";

export default function SupabaseProfileExample() {
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const profile = await getProfile();
        if (isMounted && profile?.team_name) {
          setTeamName(profile.team_name);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!teamName) return <p>No team found.</p>;

  return <p>Team: {teamName}</p>;
}
