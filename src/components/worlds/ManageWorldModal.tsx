{
  /* Members Tab */
}
<TabsContent value="members" className="space-y-4 mt-4">
  {members.map((member) => {
    const isOwnerMember = member.role === "owner";
    const isCurrentUser = member.user_id === user?.id;

    return (
      <div key={member.id} className="p-4 rounded-lg bg-secondary">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{member.profiles?.username || "Unknown"}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                member.role === "owner"
                  ? "bg-primary text-primary-foreground"
                  : member.role === "admin"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {member.role}
            </span>
            {member.is_banned && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-destructive text-destructive-foreground">
                Banned
              </span>
            )}
            {member.timeout_until && new Date(member.timeout_until) > new Date() && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Timed out
              </span>
            )}
          </div>
        </div>

        {!isOwnerMember && !isCurrentUser && (
          <div className="flex flex-wrap gap-2">
            {member.role !== "admin" ? (
              <Button size="sm" variant="secondary" onClick={() => handlePromote(member.id, member.user_id, "admin")}>
                <Crown className="w-3 h-3 mr-1" /> Promote
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => handlePromote(member.id, member.user_id, "member")}>
                <Shield className="w-3 h-3 mr-1" /> Demote
              </Button>
            )}

            <Select
              onValueChange={(value) => {
                const duration = TIMEOUT_DURATIONS.find((d) => d.value.toString() === value);
                if (duration) {
                  handleTimeout(member.id, member.user_id, duration.value, duration.label);
                }
              }}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <Clock className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Timeout" />
              </SelectTrigger>
              <SelectContent>
                {TIMEOUT_DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value.toString()}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" variant="secondary" onClick={() => handleKick(member.id, member.user_id)}>
              <X className="w-3 h-3 mr-1" /> Kick
            </Button>

            {!member.is_banned ? (
              <Button size="sm" variant="destructive" onClick={() => handleBan(member.id, member.user_id)}>
                <Ban className="w-3 h-3 mr-1" /> Ban
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => handleUnban(member.id, member.user_id)}>
                Unban
              </Button>
            )}
          </div>
        )}
      </div>
    );
  })}
</TabsContent>;
