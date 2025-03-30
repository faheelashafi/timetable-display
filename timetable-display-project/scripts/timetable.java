public class Timetable {
    private List<Entry> entries;

    public Timetable() {
        entries = new ArrayList<>();
    }

    public boolean validateAdminLogin(String username, String password) {
        // Simple validation logic (replace with real authentication)
        return "admin".equals(username) && "password".equals(password);
    }

    public void addEntry(String session, String courseName, String timeSlot) {
        Entry newEntry = new Entry(session, courseName, timeSlot);
        entries.add(newEntry);
    }

    public List<Entry> getEntries() {
        return entries;
    }

    public static class Entry {
        private String session;
        private String courseName;
        private String timeSlot;

        public Entry(String session, String courseName, String timeSlot) {
            this.session = session;
            this.courseName = courseName;
            this.timeSlot = timeSlot;
        }

        public String getSession() {
            return session;
        }

        public String getCourseName() {
            return courseName;
        }

        public String getTimeSlot() {
            return timeSlot;
        }
    }
}