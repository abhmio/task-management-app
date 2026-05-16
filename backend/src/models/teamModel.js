const { mongoose } = require('../config/db');
const { getNextSequence } = require('./counterModel');
const userModel = require('./userModel');

const teamMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user_id: {
      type: Number,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const teamSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    created_by: {
      type: Number,
      required: true,
      index: true,
    },
    members: {
      type: [teamMemberSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: true },
    versionKey: false,
  },
);

teamSchema.pre('save', async function assignNumericId(next) {
  if (!this.id) {
    this.id = await getNextSequence('teams');
  }

  next();
});

const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);

function mapMember(member, user) {
  return {
    team_id: member.team_id,
    user_id: member.user_id,
    role: member.role,
    name: user?.name || '',
    email: user?.email || '',
    created_at: user?.created_at || user?.createdAt || null,
  };
}

async function createTeam({ name, description, created_by }) {
  const creator = await userModel.findDocumentById(created_by);
  if (!creator) {
    return null;
  }

  const team = await Team.create({
    name,
    description: description || '',
    createdBy: creator._id,
    created_by: creator.id,
    members: [
      {
        user: creator._id,
        user_id: creator.id,
        role: 'admin',
      },
    ],
  });

  return findTeamById(team.id, created_by);
}

async function findTeamsForUser(userId) {
  const teams = await Team.find({ 'members.user_id': Number(userId) })
    .sort({ createdAt: -1 })
    .lean();

  const creatorIds = [...new Set(teams.map((team) => team.created_by))];
  const creators = await Promise.all(creatorIds.map((id) => userModel.findById(id)));
  const creatorsMap = new Map(creators.filter(Boolean).map((user) => [user.id, user]));

  return teams.map((team) => {
    const membership = team.members.find((member) => member.user_id === Number(userId));
    const creator = creatorsMap.get(team.created_by);

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      created_by: team.created_by,
      created_at: team.createdAt,
      membership_role: membership?.role || 'member',
      created_by_name: creator?.name || '',
      member_count: team.members.length,
    };
  });
}

async function findTeamById(teamId, userId) {
  const team = await Team.findOne({
    id: Number(teamId),
    'members.user_id': Number(userId),
  }).lean();

  if (!team) {
    return null;
  }

  const memberUsers = await Promise.all(
    team.members.map((member) => userModel.findById(member.user_id)),
  );
  const memberMap = new Map(
    memberUsers.filter(Boolean).map((user) => [user.id, user]),
  );
  const creator = await userModel.findById(team.created_by);

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    created_by: team.created_by,
    created_at: team.createdAt,
    created_by_name: creator?.name || '',
    members: team.members.map((member) =>
      mapMember(
        {
          ...member,
          team_id: team.id,
        },
        memberMap.get(member.user_id),
      ),
    ),
  };
}

async function findTeamMembership(teamId, userId) {
  const team = await Team.findOne(
    {
      id: Number(teamId),
      'members.user_id': Number(userId),
    },
    { members: 1, id: 1 },
  ).lean();

  if (!team) {
    return null;
  }

  const member = team.members.find((entry) => entry.user_id === Number(userId));
  if (!member) {
    return null;
  }

  return {
    team_id: team.id,
    user_id: member.user_id,
    role: member.role,
  };
}

async function addMember({ teamId, userId, role }) {
  const user = await userModel.findDocumentById(userId);
  if (!user) {
    return;
  }

  await Team.updateOne(
    { id: Number(teamId) },
    {
      $push: {
        members: {
          user: user._id,
          user_id: user.id,
          role,
        },
      },
    },
  );
}

module.exports = {
  Team,
  createTeam,
  findTeamsForUser,
  findTeamById,
  findTeamMembership,
  addMember,
};
