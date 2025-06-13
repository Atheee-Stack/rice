/**
 * Represents a user's profile information.
 * 
 * @domain User
 */
export interface UserProfile {
  /**
   * Unique identifier for the user
   */
  id: string;

  /**
   * The user's full name
   */
  name: string;

  /**
   * The user's email address
   */
  email: string;

  /**
   * URL to the user's profile picture
   */
  avatarUrl?: string;

  /**
   * The user's job title or position
   */
  title?: string;

  /**
   * The user's primary department identifier
   */
  departmentId?: string;

  /**
   * The date and time when the user profile was created
   */
  createdAt: Date;

  /**
   * The date and time when the user profile was last updated
   */
  updatedAt: Date;
}