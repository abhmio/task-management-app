const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const teamModel = require('../models/teamModel');
const userModel = require('../models/userModel');

const createTeam = asyncHandler(async (request, response) => {
  const team = await teamModel.createTeam({
    ...request.body,
    created_by: request.user.id,
  });

  response.status(201).json({
    success: true,
    message: 'Team created successfully',
    data: team,
  });
});

const getTeams = asyncHandler(async (request, response) => {
  const teams = await teamModel.findTeamsForUser(request.user.id);

  response.status(200).json({
    success: true,
    message: 'Teams fetched successfully',
    data: teams,
  });
});

const addMember = asyncHandler(async (request, response) => {
  const membership = await teamModel.findTeamMembership(
    request.params.id,
    request.user.id,
  );

  if (!membership) {
    throw new ApiError(404, 'Team not found');
  }

  if (membership.role !== 'admin') {
    throw new ApiError(403, 'Only Admin can change roles');
  }

  const user = await userModel.findById(request.body.user_id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const existingMembership = await teamModel.findTeamMembership(
    request.params.id,
    request.body.user_id,
  );

  if (existingMembership) {
    throw new ApiError(409, 'User already exists in team');
  }

  await teamModel.addMember({
    teamId: request.params.id,
    userId: request.body.user_id,
    role: request.body.role,
  });

  const team = await teamModel.findTeamById(request.params.id, request.user.id);

  response.status(200).json({
    success: true,
    message: 'Member added successfully',
    data: team,
  });
});

const getTeamById = asyncHandler(async (request, response) => {
  const team = await teamModel.findTeamById(request.params.id, request.user.id);

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  response.status(200).json({
    success: true,
    message: 'Team details fetched successfully',
    data: team,
  });
});

module.exports = {
  createTeam,
  getTeams,
  addMember,
  getTeamById,
};
